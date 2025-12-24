from django.core.cache import cache
import io
import logging

import pandas as pd

from apps.business_app.models.allele_node import AlleleNode
from apps.business_app.models.initial_file_data import InitialFileData
from apps.business_app.models.initial_xyz_expansion_data import InitialXyzExpansionData
from apps.business_app.models.pdb_files import PdbFiles
from apps.business_app.models.site_configurations import SiteConfiguration
from apps.business_app.utils.excel_reader import ExcelNomenclators, ExcelReader
from django.db import transaction


logger = logging.getLogger(__name__)


class XslxToPdb(ExcelReader):
    def __init__(self, origin_file, global_configuration) -> None:
        super().__init__(origin_file)
        self.upload_to_drive = global_configuration.upload_to_drive
        if self.upload_to_drive:
            self.input_df = pd.read_excel(
                self.origin_file,
                sheet_name=ExcelNomenclators.input_sheet,
                engine="openpyxl",
            )
            self.constants_df = pd.read_excel(
                self.origin_file,
                sheet_name=ExcelNomenclators.constants_sheet,
                engine="openpyxl",
            )

        if self.upload_to_drive:
            self.input_mandatory_columns_for_validation = (
                ExcelNomenclators.input_original_value_column_name,
                ExcelNomenclators.input_min_value_column_name,
                ExcelNomenclators.input_max_value_column_name,
                ExcelNomenclators.input_allele_column_name,
                ExcelNomenclators.input_marker_column_name,
                ExcelNomenclators.input_column_to_change_value_column_name,
            )
            self._validate_input_sheet_file_structure()
        config = SiteConfiguration.get_solo()
        self.stick_radius_min_value = config.stick_radius_min_value
        self.stick_radius_if_children = config.stick_radius_if_children
        self.stick_radius_factor = config.stick_radius_factor
        self.sphere_radius_factor = config.sphere_radius_factor

    def _validate_input_sheet_file_structure(self):
        first_row_input = self.input_df.iloc[0]
        for column in self.input_mandatory_columns_for_validation:
            try:
                first_row_input[column]
            except KeyError as e:
                logger.error(f"{str(e)}")
                raise ValueError(
                    f"Invalid file structure, the table on the sheet '{ExcelNomenclators.input_sheet}' "
                    f"has at least the next column missing: {column}."
                ) from None

    def proccess_initial_file_data(self, uploaded_file_id):
        print("Proccessing initial file data...")
        data = []
        for index, row in self.input_df.iterrows():
            data.append(
                InitialFileData(
                    allele=row[ExcelNomenclators.input_allele_column_name],
                    marker=row[ExcelNomenclators.input_marker_column_name],
                    min_value=row[ExcelNomenclators.input_min_value_column_name],
                    max_value=row[ExcelNomenclators.input_max_value_column_name],
                    original_value=int(
                        row[ExcelNomenclators.input_original_value_column_name]
                    ),
                    uploaded_file_id=uploaded_file_id,
                    row_index=index + 2,
                )
            )
        with transaction.atomic():
            InitialFileData.objects.bulk_create(data)
        info_row = 0
        x_column = 0
        y_column = 1
        z_column = 2
        x_value = self.constants_df.iat[info_row, x_column]
        y_value = self.constants_df.iat[info_row, y_column]
        z_value = self.constants_df.iat[info_row, z_column]
        InitialXyzExpansionData.objects.create(
            x_value=x_value,
            y_value=y_value,
            z_value=z_value,
            uploaded_file_id=uploaded_file_id,
        )

    def proccess_pdb_file(self, uploaded_file_id, pdb_filename_base):
        print("Proccessing PDB file...")
        allele_allele_number_pool = []
        try:
            pdb_files = [io.StringIO() for _ in range(self.coordinates_sets)]
            # Open the PDB file for writing
            allele_nodes = {}

            # atom_number = 0
            relations_for_the_end = {}
            element = None
            # Loop over each row in the Excel file
            for _, row in self.output_df.iterrows():
                allele = row[ExcelNomenclators.output_allele_column_name]
                # if self.ilu_search_criteria in allele:
                #     continue
                # age = row.get(ExcelNomenclators.age)
                age_1 = row.get(ExcelNomenclators.age_1)
                age_2 = row.get(ExcelNomenclators.age_2)
                loss = row.get(ExcelNomenclators.loss)
                increment = row.get(ExcelNomenclators.increment)

                frec_afr_amr = row.get(ExcelNomenclators.frec_afr_amr)
                frec_amr = row.get(ExcelNomenclators.frec_amr)
                frec_csa = row.get(ExcelNomenclators.frec_csa)
                frec_eas = row.get(ExcelNomenclators.frec_eas)
                frec_eur = row.get(ExcelNomenclators.frec_eur)
                frec_lat = row.get(ExcelNomenclators.frec_lat)
                frec_nea = row.get(ExcelNomenclators.frec_nea)
                frec_oce = row.get(ExcelNomenclators.frec_oce)
                frec_ssa = row.get(ExcelNomenclators.frec_ssa)
                frec_afr_eas = row.get(ExcelNomenclators.frec_afr_eas)
                frec_afr_swe = row.get(ExcelNomenclators.frec_afr_swe)
                frec_afr_nor = row.get(ExcelNomenclators.frec_afr_nor)
                frec_ca = row.get(ExcelNomenclators.frec_ca)
                frec_sa = row.get(ExcelNomenclators.frec_sa)

                if pd.isna(allele) or pd.isna(
                    row[ExcelNomenclators.output_number_column_name]
                ):
                    break
                allele_number = int(row[ExcelNomenclators.output_number_column_name])
                if allele_number in allele_allele_number_pool:
                    continue
                allele_allele_number_pool.append(allele_number)
                rs = row[ExcelNomenclators.output_rs_column_name]
                parents_info = row[ExcelNomenclators.output_parent_column_name]

                parents = []
                if not pd.isna(parents_info):
                    parents = (
                        int(parent.strip()) for parent in parents_info.split(",")
                    )
                for parent in parents:
                    if parent == allele_number:
                        continue
                    relations_for_the_end.setdefault(parent, []).append(allele_number)
                # element = next(self.elements_symbol_iterator)
                region = row.get(ExcelNomenclators.output_region_column_name)
                if isinstance(region, str):
                    region = region.upper()
                element = self.region_color_maping.get(
                    region, self.default_value_if_no_region
                )

                # Write the atom record in the PDB file format
                current_coordinate_index = 0

                for memory_file in pdb_files:
                    x_value = row[f"X{current_coordinate_index}"]
                    y_value = row[f"Y{current_coordinate_index}"]
                    z_value = row[f"Z{current_coordinate_index}"]
                    if pd.isna(x_value) or pd.isna(y_value) or pd.isna(z_value):
                        raise ValueError(
                            f"Faltan elementos relacionados con las coordenadas. Revisar el alelo {allele_number}"
                        )
                    memory_file.write(
                        ExcelNomenclators.get_atom_record_string(
                            allele_number=allele_number,
                            element=element,
                            x_coordinate=int(x_value),
                            y_coordinate=int(y_value),
                            z_coordinate=int(z_value),
                        )
                    )
                    memory_file.write("\n")
                    current_coordinate_index += 1

                allele_nodes[allele_number] = AlleleNode.objects.create(
                    element=element,
                    number=allele_number,
                    custom_element_name=allele,
                    rs=rs,
                    uploaded_file_id=uploaded_file_id,
                    region=region,
                    #! Age is no longer coming in the excel file, for timeline we will use temporarily age_1
                    # timeline_appearence=None if pd.isna(age) else age,
                    timeline_appearence=None if pd.isna(age_1) else age_1,
                    age_1=None if pd.isna(age_1) else age_1,
                    age_2=None if pd.isna(age_2) else age_2,
                    frec_afr_amr=None if pd.isna(frec_afr_amr) else frec_afr_amr,
                    frec_amr=None if pd.isna(frec_amr) else frec_amr,
                    frec_csa=None if pd.isna(frec_csa) else frec_csa,
                    frec_eas=None if pd.isna(frec_eas) else frec_eas,
                    frec_eur=None if pd.isna(frec_eur) else frec_eur,
                    frec_lat=None if pd.isna(frec_lat) else frec_lat,
                    frec_nea=None if pd.isna(frec_nea) else frec_nea,
                    frec_oce=None if pd.isna(frec_oce) else frec_oce,
                    frec_ssa=None if pd.isna(frec_ssa) else frec_ssa,
                    frec_afr_eas=None if pd.isna(frec_afr_eas) else frec_afr_eas,
                    frec_afr_swe=None if pd.isna(frec_afr_swe) else frec_afr_swe,
                    frec_afr_nor=None if pd.isna(frec_afr_nor) else frec_afr_nor,
                    frec_ca=None if pd.isna(frec_ca) else frec_ca,
                    frec_sa=None if pd.isna(frec_sa) else frec_sa,
                    loss=loss,
                    increment=increment,
                    unique_number=f"{uploaded_file_id}-{allele_number}",
                    sphere_radius=self._get_sphere_radius(0),
                    stick_radius=self._get_stick_radius(0),
                )

            for k, v in relations_for_the_end.items():
                current_node = allele_nodes.get(k)
                if current_node and current_node.pk:
                    children_list = []
                    for value in v:
                        child = allele_nodes.get(value)
                        if child and child.pk:
                            children_list.append(child)
                            for memory_file in pdb_files:
                                memory_file.write(
                                    ExcelNomenclators.get_atom_connection_record_string(
                                        origin_index=k,
                                        destination_index=value,
                                    )
                                )
                                memory_file.write("\n")

                    current_node.children.set(children_list)

                    current_node.sphere_radius = self._get_sphere_radius(
                        len(children_list)
                    )
                    current_node.stick_radius = self._get_stick_radius(
                        len(children_list)
                    )
                    current_node.save(
                        update_fields=(
                            "sphere_radius",
                            "stick_radius",
                        )
                    )

            index = 0
            for memory_file in pdb_files:
                memory_file.write("END")
                file_content = memory_file.getvalue()
                memory_file.close()
                self.create_pdb_and_persist_on_db(
                    file_content=file_content,
                    pdb_filename_base=pdb_filename_base,
                    suffix=f"excel_{index}",
                    uploaded_file_id=uploaded_file_id,
                    kind=PdbFiles.KIND.EXCEL_GENERATED,
                )
                index += 1

            # return pdb_file_0
        except Exception as e:
            AlleleNode.objects.filter(uploaded_file__isnull=True).delete()
            logger.error(f"An error occurred during file parsing: {e}")
            raise ValueError(f"An error occurred during file parsing: {e}.") from e

    def _get_sphere_radius(self, children_count):
        cached_sphere_radious = cache.get(
            f"sphere_radius_for_{children_count}_children"
        )
        if cached_sphere_radious:
            return cached_sphere_radious
        new_sphere_radius_value = (
            self._get_stick_radius(children_count) * self.sphere_radius_factor
        )
        cache.set(
            f"sphere_radius_for_{children_count}_children",
            new_sphere_radius_value,
            timeout=None,
        )
        return new_sphere_radius_value

    def _get_stick_radius(self, children_count):
        cached_stick_radious = cache.get(f"stick_radius_for_{children_count}_children")
        if cached_stick_radious:
            return cached_stick_radious

        if not children_count:
            new_stick_radius_value = self.stick_radius_min_value
        else:
            new_stick_radius_value = (
                self.stick_radius_if_children
                + self.stick_radius_factor * children_count
            )
        cache.set(
            f"stick_radius_for_{children_count}_children",
            new_stick_radius_value,
            timeout=None,
        )
        return new_stick_radius_value

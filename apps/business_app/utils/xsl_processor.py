import logging
from django.core.exceptions import ValidationError

import pandas as pd

from .excel_nomenclators import ExcelNomenclators
from ..models.task import Task
from ..models.wbs import WBS
from ..models.resource import Resource


logger = logging.getLogger(__name__)


class XslProcessor:
    def __init__(self, origin_file) -> None:
        self.origin_file = origin_file

        mandatory_task_columns_for_validation = (
            ExcelNomenclators.sheet_task_column_delete_record_flag,
            ExcelNomenclators.sheet_task_column_total_float_hr_cnt,
            ExcelNomenclators.sheet_task_column_target_cost,
            ExcelNomenclators.sheet_task_column_resource_list,
            ExcelNomenclators.sheet_task_column_end_date,
            ExcelNomenclators.sheet_task_column_start_date,
            ExcelNomenclators.sheet_task_column_remain_drtn_hr_cnt,
            ExcelNomenclators.sheet_task_column_target_drtn_hr_cnt,
            ExcelNomenclators.sheet_task_column_task_name,
            ExcelNomenclators.sheet_task_column_wbs_id,
            ExcelNomenclators.sheet_task_column_status_code,
            ExcelNomenclators.sheet_task_column_task_code,
        )
        try:
            self.task_df = pd.read_excel(
                origin_file, sheet_name=ExcelNomenclators.task_sheet, engine="openpyxl"
            )
        except OSError as e:
            if "no valid workbook part" in str(e):
                raise ValidationError(
                    "Invalid Excel file: The file appears to be empty or corrupted"
                )
            raise
        self._validate_sheet_structure(
            df=self.task_df,
            mandatory_columns=mandatory_task_columns_for_validation,
            sheet=ExcelNomenclators.task_sheet,
        )

    def _validate_sheet_structure(self, df, mandatory_columns, sheet):
        first_row_input = df.iloc[0]
        for column in mandatory_columns:
            try:
                first_row_input[column]
            except KeyError as e:
                logger.error(f"{str(e)}")
                raise ValidationError(
                    f"Invalid file structure, the table on the sheet '{sheet}' "
                    f"has at least the next column missing: {column}."
                ) from None

    def proccess_task_data(self, uploaded_file_id):
        logger.info("Proccessing task sheet...")
        for index, row in self.task_df.iterrows():
            if not index:
                continue
            try:
                wbs, _ = WBS.objects.get_or_create(
                    wbs_id=row[ExcelNomenclators.sheet_task_column_wbs_id]
                )
                resources_names = (
                    []
                    if pd.isna(row[ExcelNomenclators.sheet_task_column_resource_list])
                    else str(
                        row[ExcelNomenclators.sheet_task_column_resource_list]
                    ).split(",")
                )
                resources = []

                for res_name in resources_names:
                    resource, _ = Resource.objects.get_or_create(
                        name=res_name, defaults={"resource_type": ""}
                    )
                    resources.append(resource)

                # Define el formato correcto para fechas con AM/PM (formato 12h)
                start_date = pd.to_datetime(
                    row[ExcelNomenclators.sheet_task_column_start_date], errors="coerce"
                )
                end_date = pd.to_datetime(
                    row[ExcelNomenclators.sheet_task_column_end_date], errors="coerce"
                )

                task, _ = Task.objects.update_or_create(
                    task_code=row[ExcelNomenclators.sheet_task_column_task_code],
                    defaults={
                        "wbs": wbs,
                        "status_code": row[
                            ExcelNomenclators.sheet_task_column_status_code
                        ],
                        "task_name": row[ExcelNomenclators.sheet_task_column_task_name],
                        "target_drtn_hr_cnt": int(
                            row[ExcelNomenclators.sheet_task_column_target_drtn_hr_cnt]
                        ),
                        "remain_drtn_hr_cnt": int(
                            row[ExcelNomenclators.sheet_task_column_remain_drtn_hr_cnt]
                        ),
                        "start_date": start_date if pd.notna(start_date) else None,
                        "end_date": end_date if pd.notna(end_date) else None,
                        "total_float_hr_cnt": row[
                            ExcelNomenclators.sheet_task_column_total_float_hr_cnt
                        ]
                        if not pd.isna(
                            row[ExcelNomenclators.sheet_task_column_total_float_hr_cnt]
                        )
                        else 0,
                        "target_cost": row[
                            ExcelNomenclators.sheet_task_column_target_cost
                        ]
                        if not pd.isna(
                            row[ExcelNomenclators.sheet_task_column_target_cost]
                        )
                        else 0,
                        "delete_record_flag": bool(
                            row[ExcelNomenclators.sheet_task_column_delete_record_flag]
                        )
                        if not pd.isna(
                            row[ExcelNomenclators.sheet_task_column_delete_record_flag]
                        )
                        else False,
                    },
                )
                task.resources.set(resources)

            except Exception as e:
                print(f"----------An exception occurred in line {index}: {e}")
                raise

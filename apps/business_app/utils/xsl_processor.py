import logging
from django.core.exceptions import ValidationError

import pandas as pd

from .utils.excel_nomenclators import ExcelNomenclators
from django.db import transaction
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
        self.task_df = pd.read_excel(
            self.origin_file,
            sheet_name=ExcelNomenclators.task_sheet,
            engine="openpyxl",
        )
        self._validate_sheet_structure(
            df=self.task_df,
            mandatory_columns=mandatory_task_columns_for_validation,
            sheet=ExcelNomenclators.task_sheet,
        )

    def _validate_sheet_structure(self, df, mandatory_columns, sheet):
        first_row_input = self.df.iloc[0]
        for column in self.mandatory_columns:
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
        data = []
        for index, row in self.input_df.iterrows():
            wbs, _ = WBS.objects.get_or_create(
                wbs_id=row[ExcelNomenclators.sheet_task_column_wbs_id]
            )
            resources_names = row[
                ExcelNomenclators.sheet_task_column_resource_list
            ].split(",")
            resources = []
            for res_name in resources_names:
                resource, _ = Resource.objects.get_or_create(
                    name=res_name, defaults={"resource_type": ""}
                )
                resources.append(resource)
            data.append(
                Task(
                    task_code=row[ExcelNomenclators.sheet_task_column_task_code],
                    wbs=wbs,
                    status_code=row[ExcelNomenclators.sheet_task_column_status_code],
                    task_name=row[ExcelNomenclators.sheet_task_column_task_name],
                    target_drtn_hr_cnt=int(
                        row[ExcelNomenclators.sheet_task_column_target_drtn_hr_cnt]
                    ),
                    remain_drtn_hr_cnt=int(
                        row[ExcelNomenclators.sheet_task_column_remain_drtn_hr_cnt]
                    ),
                    start_date=row[ExcelNomenclators.sheet_task_column_start_date],
                    end_date=row[ExcelNomenclators.sheet_task_column_end_date],
                    target_cost=row[ExcelNomenclators.sheet_task_column_target_cost],
                    total_float_hr_cnt=row[
                        ExcelNomenclators.sheet_task_column_total_float_hr_cnt
                    ],
                    delete_record_flag=row[
                        ExcelNomenclators.sheet_task_column_delete_record_flag
                    ],
                    resources=resources,
                )
            )
        with transaction.atomic():
            Task.objects.bulk_create(data)

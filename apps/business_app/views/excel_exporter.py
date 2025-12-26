from rest_framework import viewsets, decorators, response, status
from django.conf import settings
from django.utils import timezone
import pandas as pd
import os

from ..models.task import Task
from ..utils.excel_nomenclators import ExcelNomenclators


class ExcelExporterViewSet(viewsets.ViewSet):
    """ViewSet to export Task objects to an Excel file and return its URL."""

    @decorators.action(detail=False, methods=["get"])
    def export(self, request):
        tasks = Task.objects.all().prefetch_related("resources")

        rows = []
        for t in tasks:
            resources = ",".join([r.name for r in t.resources.all()])
            rows.append(
                {
                    ExcelNomenclators.sheet_task_column_task_code: t.task_code,
                    ExcelNomenclators.sheet_task_column_status_code: t.status_code,
                    ExcelNomenclators.sheet_task_column_wbs_id: t.wbs.wbs_id
                    if t.wbs
                    else "",
                    ExcelNomenclators.sheet_task_column_task_name: t.task_name,
                    ExcelNomenclators.sheet_task_column_target_drtn_hr_cnt: t.target_drtn_hr_cnt,
                    ExcelNomenclators.sheet_task_column_remain_drtn_hr_cnt: t.remain_drtn_hr_cnt,
                    ExcelNomenclators.sheet_task_column_start_date: t.start_date.isoformat()
                    if t.start_date
                    else None,
                    ExcelNomenclators.sheet_task_column_end_date: t.end_date.isoformat()
                    if t.end_date
                    else None,
                    ExcelNomenclators.sheet_task_column_resource_list: resources,
                    ExcelNomenclators.sheet_task_column_target_cost: float(
                        t.target_cost
                    )
                    if t.target_cost is not None
                    else 0,
                    ExcelNomenclators.sheet_task_column_total_float_hr_cnt: t.total_float_hr_cnt,
                    ExcelNomenclators.sheet_task_column_delete_record_flag: t.delete_record_flag
                    if t.delete_record_flag
                    else "",
                }
            )

        columns = [
            ExcelNomenclators.sheet_task_column_task_code,
            ExcelNomenclators.sheet_task_column_status_code,
            ExcelNomenclators.sheet_task_column_wbs_id,
            ExcelNomenclators.sheet_task_column_task_name,
            ExcelNomenclators.sheet_task_column_target_drtn_hr_cnt,
            ExcelNomenclators.sheet_task_column_remain_drtn_hr_cnt,
            ExcelNomenclators.sheet_task_column_start_date,
            ExcelNomenclators.sheet_task_column_end_date,
            ExcelNomenclators.sheet_task_column_resource_list,
            ExcelNomenclators.sheet_task_column_target_cost,
            ExcelNomenclators.sheet_task_column_total_float_hr_cnt,
            ExcelNomenclators.sheet_task_column_delete_record_flag,
        ]

        df = pd.DataFrame(rows, columns=columns)

        media_root = getattr(settings, "MEDIA_ROOT", os.path.join(os.getcwd(), "media"))
        export_dir = os.path.join(media_root, "primavera_imports")
        os.makedirs(export_dir, exist_ok=True)
        filename = f"tasks_export_{timezone.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        filepath = os.path.join(export_dir, filename)

        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name=ExcelNomenclators.task_sheet, index=False)

        media_url = getattr(settings, "MEDIA_URL", "/media/")
        file_url = f"{media_url.rstrip('/')}/primavera_imports/{filename}"

        return response.Response({"url": file_url}, status=status.HTTP_200_OK)

from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter

from app.models.lead import Lead

HEADERS = [
    "Дата", "Имя", "Компания", "Телефон", "Email", "Категория", "Подзадача",
    "Город", "Кол-во", "Желаемый срок", "Сообщение", "Страница", "Язык",
    "Статус", "Сумма сделки", "Ответственный", "Источник",
]


def _lead_row(lead: Lead) -> list:
    return [
        lead.created_at.strftime("%d.%m.%Y %H:%M") if lead.created_at else "",
        lead.name,
        lead.company or "",
        lead.phone,
        lead.email or "",
        lead.category or "",
        lead.subtask or "",
        lead.city or "",
        lead.quantity or "",
        lead.preferred_date.strftime("%d.%m.%Y") if lead.preferred_date else "",
        lead.message or "",
        lead.source_page or "",
        lead.locale or "",
        lead.status.value,
        float(lead.deal_amount) if lead.deal_amount is not None else "",
        lead.assignee.name if lead.assignee else "",
        lead.source or "",
    ]


def _build_workbook(leads: list[Lead]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Заявки"

    ws.append(HEADERS)
    for cell in ws[1]:
        cell.font = Font(bold=True)

    for lead in leads:
        ws.append(_lead_row(lead))

    for i, _ in enumerate(HEADERS, 1):
        ws.column_dimensions[get_column_letter(i)].width = 18

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def export_leads_to_excel(leads: list[Lead]) -> bytes:
    return _build_workbook(list(leads))


def export_lead_to_excel(lead: Lead) -> bytes:
    return _build_workbook([lead])

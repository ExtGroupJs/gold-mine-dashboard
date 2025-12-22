from django.core.mail import send_mail


def send_email_function(
    subject, message, html_message, recipient_list, from_email=None
):
    send_mail(
        subject=subject,
        message=message,
        html_message=html_message,
        recipient_list=recipient_list,
        from_email=from_email,
    )

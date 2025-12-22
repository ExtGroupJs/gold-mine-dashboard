from django.template.loader import render_to_string


def send_email(subject, message, html_message, recipient_list, from_email=None):
    send_email(
        subject=subject,
        message=message,
        html_message=html_message,
        recipient_list=recipient_list,
        from_email=from_email,
    )


def send_email_to_client(req_srv, email, textmail, time_to_complete):
    ctx = {
        "user": email,
        "service": req_srv,
        "textmail": textmail,
        "time_to_complete": time_to_complete,
    }
    body = render_to_string(template_name="email/generic.html", context=ctx)
    html = render_to_string(template_name="email/service_requested.html", context=ctx)
    send_email(
        subject=f"Nuevo servicio de <{req_srv}> solicitado",
        message=body,
        html_message=html,
        recipient_list=[email],
        from_email="AmazonQva <soporte@amazonqva.com>",
    )

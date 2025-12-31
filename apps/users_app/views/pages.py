from django.shortcuts import redirect, render

from apps.users_app.models.groups import Groups

# Create your views here.


def index(request):
    from django.conf import settings

    return render(
        request,
        "dashboard/dashboard.html",
        {
            "pusher_key": settings.PUSHER_KEY,
            "pusher_cluster": settings.PUSHER_CLUSTER,
        },
    )


def usuarios(request):
    return render(request, "user/usuarios.html")


def first_login(request):
    return render(request, "login/login.html")


def register(request):
    return render(request, "login/register.html")


def brands(request):
    return render(request, "brands/brands.html")


def models(request):
    return render(request, "models/models.html")


def shops(request):
    return render(request, "shops/shop.html")


def products(request):
    return render(request, "products/products.html")


def shop_products(request):
    return render(request, "shop_products/shop_products.html")


# paginas de la mina


def task(request):
    return render(request, "task/task.html")


def taskSupervisor(request):
    return render(request, "task/taskSupervisor.html")


def dashboard(request):
    return render(request, "dashboard/dashboard.html")


def user_redirect(request):
    # Definimos la lista de los 3 grupos que pueden ver el dashboard
    allowed_groups = [
        Groups.DASHBOARD_CLIENT.value,
        Groups.PLANNER.value,
        Groups.SUPER_ADMIN.value,
    ]

    # Verificamos si el usuario pertenece a ALGUNO de los grupos de la lista
    if request.user.groups.filter(id__in=allowed_groups).exists():
        return redirect("dashboard")
    else:
        return redirect("taskSupervisor")

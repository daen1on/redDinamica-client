export const ADMIN_MENU = [
    {
        "id": "users",
        "buttonClass": "btn-info",
        "iconClass": "fa-user",
        "spanContent": "Usuarios",
        "subOptions": [
            {
                "text": "Nuevos usuarios",
                "routerLink": "/admin/usuarios-nuevos"
            },
            {
                "text": "Todos los usuarios",
                "routerLink": "/admin/usuarios"
            }
        ]
    },
    {
        "id": "academic",
        "buttonClass": "btn-success",
        "iconClass": "fa-graduation-cap",
        "spanContent": "RedDinámica académica",
        "subOptions": [
            {
                "text": "Grupos académicos",
                "routerLink": "/admin/academico/grupos"
            },
            {
                "text": "Lecciones académicas",
                "routerLink": "/admin/academico/lecciones"
            },
            {
                "text": "Mejores lecciones",
                "routerLink": "/admin/academico/destacadas"
            }
        ]
    },
    {
        "id": "tasks",
        "buttonClass": "btn-secondary",
        "iconClass": "fa-tasks",
        "spanContent": "Gestión académica y tareas",
        "subOptions": [
            {
                "text": "Tareas",
                "routerLink": "/admin/tareas"
            }
        ]
    },
    {
        "id": "lessons",
        "buttonClass": "btn-warning",
        "iconClass": "fa-file-alt",
        "spanContent": "Lecciones",
        "subOptions": [
            {
                "text": "Todas las lecciones",
                "routerLink": "/admin/lecciones"
            },
            {
                "text": "Propuestas",
                "routerLink": "/admin/lecciones-propuestas"
            },
            {
                "text": "Experiencias",
                "routerLink": "/admin/experiencias"
            }
        ]
    },
    {
        "id": "resources",
        "buttonClass": "btn-danger",
        "iconClass": "fa-paperclip",
        "spanContent": "Repositorio",
        "subOptions": [
            {
                "text": "Todos los recursos",
                "routerLink": "/admin/recursos"
            },
            {
                "text": "Propuestas",
                "routerLink": "/admin/recursos-propuestos"
            }
        ]
    },
    {
        "id": "basicData",
        "buttonClass": "btn-success",
        "iconClass": "fa-database",
        "spanContent": "Datos básicos",
        "subOptions": [
            {
                "text": "Ciudades",
                "routerLink": "/admin/ciudades"
            },
            {
                "text": "Instituciones",
                "routerLink": "/admin/instituciones"
            },
            {
                "text": "Áreas de conocimiento",
                "routerLink": "/admin/areas"
            },
            {
                "text": "Profesiones",
                "routerLink": "/admin/profesiones"
            }
        ]
    },
    {
        "id": "errors",
        "buttonClass": "btn-primary",
        "iconClass": "fa-exclamation-triangle",
        "spanContent": "Errores y Sugerencias",
        "subOptions": [
            {
                "text": "Ver Errores y Sugerencias",
                "routerLink": "/admin/view-errors"
            }
        ]
    }

];

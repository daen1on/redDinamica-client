export const MAX_FILE_SIZE = 20; // eN MEGABYTES
export const TYC_FILE = "assets/TyC_RedDinamica.pdf";

// LESSON_DATA
export const LESSON_STATES = {
    proposed: {
        label: "Propuesta",
        value: "proposed",
        class: "secondary"
    },
    assigned: {
        label: "Asignada",
        value: "assigned",
        class: "warning"
    },
    development: {
        label: "Desarrollo",
        value: "development",
        class: "info"
    },
    test: {
        label: "Prueba",
        value: "test",
        class: "primary"
    },
    completed: {
        label: "Terminada",
        value: "completed",
        class: "success"
    }
};

// DATA.ts
export const ACADEMIC_LEVEL = {
    PRESCHOOL: "Preescolar",
    PRIMARY_SCHOOL: "Primaria",
    MIDDLE_SCHOOL: "Secundaria", // More specific
    HIGH_SCHOOL: "Bachillerato", // More specific
    UNIVERSITY: "Universitario",
    GRADUATE: "Posgrado",      // Added level
    PROFESSIONAL: "Profesional",  // Added level
};


// RESOURCES DATA 

export const ICON_STYLE = {
    document: {
        label: "Documento",
        icon: "fa-file-alt",
        class: "bg-success"
    },
    link: {
        label: "Enlace",
        icon: "fa-link",
        class: "bg-danger"
    },
    video: {
        label: "Video",
        icon: "fa-file-video",
        class: "bg-warning"
    },
    software: {
        label: "Software",
        icon: "fa-mouse-pointer",
        class: "bg-info"
    }
};
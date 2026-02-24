import { createI18n } from 'vue-i18n'

type NuraLocale = 'es-AR' | 'en'

const SUPPORTED_LOCALES: NuraLocale[] = ['es-AR', 'en']

const saved = localStorage.getItem('nura_locale')
const defaultLocale: NuraLocale = SUPPORTED_LOCALES.includes(saved as NuraLocale)
  ? (saved as NuraLocale)
  : 'es-AR'

const messages = {
  'es-AR': {
    language: {
      title: 'Idioma',
      intro:
        'Podés elegir el idioma de la aplicación. El cambio se aplica en toda Nura.',
      current: 'Idioma actual: ',
      esSub: 'Idioma actual de la aplicación.',
      enSub: 'Cambiar toda la app a inglés.',
      hint: 'Podés volver a cambiarlo cuando quieras.'
    },

    header: {
      home: 'Inicio',
      directory: 'Cartilla',
      schedule: 'Agendar',
      content: 'Contenido',
      profile: 'Perfil',
      notifications: 'Notificaciones',
      chatbot: 'Chatbot',
      premium: 'Premium'
    },

    home: {
      greeting: '¡Hola, {name}!',
      howFeeling: '¿Cómo te sentís hoy?',
      moods: {
        sad: 'Triste',
        ok: 'Normal',
        good: 'Bien',
        great: 'Muy bien'
      },

      quoteTitle: 'Frase del día',
      quoteSubtitle: 'Nura te acompaña todos los días',
      quotes: [
        'Sé amable con vos.',
        'Un paso a la vez.',
        'Respirá profundo y seguí.',
        'Tu proceso importa.',
        'Cuidarte también es avanzar.',
        'El descanso también es productivo.',
        'Soltar no es rendirse.',
        'Hoy merecés calma.',
        'Celebrá los pequeños logros.',
        'Pedí ayuda cuando lo necesites.'
      ],

      progressText: 'Llevás {days} días cuidando de vos',
      goal: 'Meta: {goal} días',

      activeForum: 'Foro activo',
      noActiveForums: 'Todavía no hay foros activos.',
      seeMoreForum: 'Ver más del foro',

      todayActivities: 'Actividades de hoy',
      noActivities: 'Hoy no tenés actividades agendadas.',
      addToGoogleCalendar: '+ Google Calendar',

      viewAllEntries: 'Ver todas mis entradas',
      writeToday: 'Escribir hoy',

      nurichatTitle: 'NuriChat',
      nurichatAlt:
        'Tu guía de bienestar, ahora en un chat. Habla con Nuri siempre que lo necesites',

      weekdays: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],

      calendar: {
        defaultEventTitle: 'Turno Nura',
        defaultEventDetails: 'Turno agendado desde Nura'
      }
    },

    /* AGENDAR (NUEVO) */
    agendar: {
      a11y: {
        pageTitle: 'Agendar'
      },
      header: {
        kicker: 'Agenda',
        title: 'Agendar',
        subtitle:
          'Elegí qué querés hacer hoy: sesiones, eventos, turnos o comunidad.'
      },
      options: {
        sessions: {
          title: 'Sesiones Grupales',
          description:
            'Espacios virtuales guiados por profesionales, donde podés compartir experiencias y trabajar temas como ansiedad, relación con la comida y autocuidado.',
          button: 'Ver sesiones'
        },
        appointment: {
          title: 'Turno con profesional',
          description:
            'Reservá consultas individuales con profesionales del equipo de Nura, eligiendo día, horario y modalidad. Por ahora, los turnos se gestionan desde la cartilla.',
          button: 'Ir a la cartilla'
        },
        events: {
          title: 'Eventos Grupales',
          description:
            'Charlas y talleres especiales sobre bienestar emocional y salud integral, con especialistas invitados. Encuentros puntuales para aprender, compartir y conectar.',
          button: 'Ver eventos'
        },
        forum: {
          title: 'Ir al Foro',
          description:
            'Un espacio para hacer preguntas, compartir experiencias y acompañarte con la comunidad. Ideal para sentirte contenida y no estar sola.',
          button: 'Entrar al foro'
        }
      }
    },

    profile: {
      title: 'Perfil',
      avatarAlt: 'Avatar de perfil',
      memberSince: 'Usuario desde {year}',
      edit: 'Editar',

      plan: {
        premiumTitle: 'Plan Premium',
        freeTitle: 'Plan Gratuito',
        active: 'Plan activo',
        current: 'Plan actual',
        loading: 'Cargando plan...',
        freeDesc: 'Acceso esencial para empezar a usar Nura.',
        premiumDesc:
          'Tenés acceso ilimitado al Foro, Diario y Chatbot, además de beneficios exclusivos.',
        seeDetails: 'Ver detalles del plan',
        seePlans: 'Ver planes y beneficios',
        limits: {
          forumTitle: 'Foro:',
          forumBody: ' podés comentar, pero no crear publicaciones.',
          diaryTitle: 'Diario:',
          diaryBody: ' hasta <strong>10 entradas por mes</strong>.',
          chatbotTitle: 'Chatbot:',
          chatbotBody: ' hasta <strong>10 mensajes por día</strong>.'
        }
      },

      lastMoodsTitle: 'Últimos estados de ánimo',
      noMoodsThisWeek: 'Todavía no registraste tu estado esta semana.',
      moods: {
        triste: 'Triste',
        normal: 'Normal',
        bien: 'Bien',
        muybien: 'Muy bien'
      },

      meds: {
        title: 'Medicaciones',
        loading: 'Cargando medicaciones…',
        empty: 'No tenés medicaciones cargadas.',
        myMeds: 'Mis medicaciones'
      },

      diary: {
        title: 'Mi Diario',
        emptyPreview: '',
        viewAll: 'Ver todas mis entradas',
        writeToday: 'Escribir hoy'
      },

      settings: {
        title: 'Ajustes',
        subtitle: 'Configurá cómo querés usar Nura.',
        notificationsTitle: 'Notificaciones',
        notificationsDesc: 'Elegí qué alertas recibir.',
        privacyTitle: 'Privacidad',
        privacyDesc: 'Cómo cuidamos tu información.',
        languageTitle: 'Idioma',
        languageDesc: 'Cambiá el idioma de la app.',
        helpChatTitle: 'Chat de ayuda',
        helpChatDesc: 'Hablá con Nuri cuando quieras.'
      },

      actions: {
        edit: 'Editar',
        read: 'Leer',
        openChat: 'Abrir chat'
      },

      accountTitle: 'Cuenta',
      logout: 'Cerrar sesión',

      logoutModal: {
        title: '¿Cerrar sesión?',
        text: 'Podés volver a iniciar sesión cuando quieras.',
        cancel: 'Cancelar',
        confirm: 'Cerrar sesión',
        loggingOut: 'Cerrando…'
      }
    },

    content: {
      pageSrTitle: 'Contenido educativo',
      pageTitle: 'Contenido educativo',
      tabsAria: 'Secciones de contenido',
      tabs: {
        videos: 'Videos',
        library: 'Biblioteca',
        guides: 'Guías'
      },

      loadingVideos: 'Cargando videos…',
      emptyVideos: 'Aún no hay videos.',
      loadingLibrary: 'Cargando biblioteca…',
      emptyBooks: 'Aún no hay libros recomendados.',
      loadingGuides: 'Cargando guías…',
      emptyGuides: 'Aún no hay guías.',

      actions: {
        edit: 'Editar',
        delete: 'Borrar',
        clear: 'Limpiar',
        cancel: 'Cancelar',
        save: 'Guardar cambios',
        continue: 'Continuar'
      },

      fields: {
        title: 'Título',
        description: 'Descripción',
        coverPath: 'Portada (cover_path)',
        file: 'Archivo'
      },

      video: {
        newTitle: 'Nuevo video',
        filePath: 'Archivo de video (file_path)',
        duration: 'Duración (segundos)',
        create: 'Crear video',
        fileLabelSuffix: 'de video'
      },

      book: {
        newTitle: 'Nuevo libro',
        filePath: 'Archivo PDF (file_path)',
        filePlaceholder: 'Ruta en Supabase (opcional si subís un PDF)',
        create: 'Crear libro'
      },

      guide: {
        newTitle: 'Nueva guía',
        filePath: 'Archivo PDF (file_path)',
        filePlaceholder: 'Ruta en Supabase (opcional si subís un PDF)',
        create: 'Crear guía'
      },

      pdf: {
        orUpload: 'O subí un PDF',
        select: 'Seleccionar PDF',
        iframeTitle: 'Documento',
        fileLabelSuffix: 'PDF'
      },

      articles: {
        title: 'Artículos destacados',
        reading: 'Lectura {m}m'
      },

      edit: {
        video: 'Editar video',
        book: 'Editar libro',
        guide: 'Editar guía'
      },

      delete: {
        title: 'Eliminar {item}',
        text: '¿Seguro que querés borrar',
        labels: {
          video: 'video',
          book: 'libro',
          guide: 'guía'
        }
      },

      toasts: {
        uploadPdfError: 'Error al subir el PDF.',
        loadVideosError: 'Error al cargar videos.',
        loadLibraryError: 'Error al cargar la biblioteca.',
        loadGuidesError: 'Error al cargar las guías.',
        videoRequired: 'Título y archivo de video son obligatorios.',
        videoCreateError: 'Hubo un problema al crear el video.',
        videoCreated: 'Video creado correctamente.',
        bookRequired: 'Título y archivo del libro (ruta o PDF) son obligatorios.',
        bookCreateError: 'Hubo un problema al crear el libro.',
        bookCreated: 'Libro creado correctamente.',
        guideRequired: 'Título y archivo de la guía (ruta o PDF) son obligatorios.',
        guideCreateError: 'Hubo un problema al crear la guía.',
        guideCreated: 'Guía creada correctamente.',
        editRequired: 'Título y archivo son obligatorios.',
        videoEdited: 'Video editado correctamente.',
        bookEdited: 'Libro editado correctamente.',
        guideEdited: 'Guía editado correctamente.',
        saveError: 'Error al guardar los cambios.',
        deleted: 'Contenido borrado correctamente.'
      }
    }
  },

  en: {
    language: {
      title: 'Language',
      intro:
        'You can choose the app language. This change applies across Nura.',
      current: 'Current language: ',
      esSub: 'Set the app to Spanish.',
      enSub: 'Set the whole app to English.',
      hint: 'You can change it again anytime.'
    },

    header: {
      home: 'Home',
      directory: 'Directory',
      schedule: 'Schedule',
      content: 'Content',
      profile: 'Profile',
      notifications: 'Notifications',
      chatbot: 'Chatbot',
      premium: 'Premium'
    },

    home: {
      greeting: 'Hi, {name}!',
      howFeeling: 'How are you feeling today?',
      moods: {
        sad: 'Sad',
        ok: 'Okay',
        good: 'Good',
        great: 'Great'
      },

      quoteTitle: 'Quote of the day',
      quoteSubtitle: 'Nura is with you every day',
      quotes: [
        'Be kind to yourself.',
        'One step at a time.',
        'Breathe deeply and keep going.',
        'Your process matters.',
        'Taking care of yourself is progress.',
        'Rest is productive too.',
        'Letting go is not giving up.',
        'You deserve calm today.',
        'Celebrate the small wins.',
        'Ask for help when you need it.'
      ],

      progressText: "You've been taking care of yourself for {days} days",
      goal: 'Goal: {goal} days',

      activeForum: 'Active forum',
      noActiveForums: 'There are no active forums yet.',
      seeMoreForum: 'See more in the forum',

      todayActivities: "Today's activities",
      noActivities: "You don't have any scheduled activities today.",
      addToGoogleCalendar: '+ Google Calendar',

      viewAllEntries: 'View all my entries',
      writeToday: 'Write today',

      nurichatTitle: 'NuriChat',
      nurichatAlt:
        'Your wellbeing guide, now in a chat. Talk to Nuri whenever you need it',

      weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],

      calendar: {
        defaultEventTitle: 'Nura appointment',
        defaultEventDetails: 'Appointment scheduled from Nura'
      }
    },

    /* AGENDAR (NUEVO) */
    agendar: {
      a11y: {
        pageTitle: 'Schedule'
      },
      header: {
        kicker: 'Agenda',
        title: 'Schedule',
        subtitle: 'Choose what you want to do today: sessions, events, appointments or community.'
      },
      options: {
        sessions: {
          title: 'Group Sessions',
          description:
            'Virtual guided sessions led by professionals, where you can share experiences and work on topics like anxiety, relationship with food and self-care.',
          button: 'View sessions'
        },
        appointment: {
          title: 'Appointment with a professional',
          description:
            'Book 1:1 consultations with Nura professionals by choosing date, time and modality. For now, appointments are managed from the directory.',
          button: 'Go to directory'
        },
        events: {
          title: 'Group Events',
          description:
            'Special talks and workshops on emotional wellbeing and holistic health, with invited specialists. One-time meetings to learn, share and connect.',
          button: 'View events'
        },
        forum: {
          title: 'Go to Forum',
          description:
            'A space to ask questions, share experiences and feel supported by the community.',
          button: 'Enter forum'
        }
      }
    },

    profile: {
      title: 'Profile',
      avatarAlt: 'Profile avatar',
      memberSince: 'Member since {year}',
      edit: 'Edit',

      plan: {
        premiumTitle: 'Premium Plan',
        freeTitle: 'Free Plan',
        active: 'Active plan',
        current: 'Current plan',
        loading: 'Loading plan...',
        freeDesc: 'Essential access to get started with Nura.',
        premiumDesc:
          'You have unlimited access to Forum, Diary and Chatbot, plus exclusive benefits.',
        seeDetails: 'See plan details',
        seePlans: 'See plans & benefits',
        limits: {
          forumTitle: 'Forum:',
          forumBody: ' you can comment, but not create posts.',
          diaryTitle: 'Diary:',
          diaryBody: ' up to <strong>10 entries per month</strong>.',
          chatbotTitle: 'Chatbot:',
          chatbotBody: ' up to <strong>5 uses per month</strong>.'
        }
      },

      lastMoodsTitle: 'Latest moods',
      noMoodsThisWeek: "You haven't logged your mood this week yet.",
      moods: {
        triste: 'Sad',
        normal: 'Okay',
        bien: 'Good',
        muybien: 'Great'
      },

      meds: {
        title: 'Medications',
        loading: 'Loading medications…',
        empty: "You don't have any medications saved.",
        myMeds: 'My medications'
      },

      diary: {
        title: 'My Diary',
        emptyPreview: '',
        viewAll: 'View all my entries',
        writeToday: 'Write today'
      },

      settings: {
        title: 'Settings',
        subtitle: 'Customize how you want to use Nura.',
        notificationsTitle: 'Notifications',
        notificationsDesc: 'Choose which alerts you want to receive.',
        privacyTitle: 'Privacy',
        privacyDesc: 'How we protect your information.',
        languageTitle: 'Language',
        languageDesc: 'Change the app language.',
        helpChatTitle: 'Help chat',
        helpChatDesc: 'Talk to Nuri anytime.'
      },

      actions: {
        edit: 'Edit',
        read: 'Read',
        openChat: 'Open chat'
      },

      accountTitle: 'Account',
      logout: 'Log out',

      logoutModal: {
        title: 'Log out?',
        text: 'You can sign in again anytime.',
        cancel: 'Cancel',
        confirm: 'Log out',
        loggingOut: 'Logging out…'
      }
    },

    content: {
      pageSrTitle: 'Educational content',
      pageTitle: 'Educational content',
      tabsAria: 'Content sections',
      tabs: {
        videos: 'Videos',
        library: 'Library',
        guides: 'Guides'
      },

      loadingVideos: 'Loading videos…',
      emptyVideos: 'No videos yet.',
      loadingLibrary: 'Loading library…',
      emptyBooks: 'No recommended books yet.',
      loadingGuides: 'Loading guides…',
      emptyGuides: 'No guides yet.',

      actions: {
        edit: 'Edit',
        delete: 'Delete',
        clear: 'Clear',
        cancel: 'Cancel',
        save: 'Save changes',
        continue: 'Continue'
      },

      fields: {
        title: 'Title',
        description: 'Description',
        coverPath: 'Cover (cover_path)',
        file: 'File'
      },

      video: {
        newTitle: 'New video',
        filePath: 'Video file (file_path)',
        duration: 'Duration (seconds)',
        create: 'Create video',
        fileLabelSuffix: 'video'
      },

      book: {
        newTitle: 'New book',
        filePath: 'PDF file (file_path)',
        filePlaceholder: 'Supabase path (optional if you upload a PDF)',
        create: 'Create book'
      },

      guide: {
        newTitle: 'New guide',
        filePath: 'PDF file (file_path)',
        filePlaceholder: 'Supabase path (optional if you upload a PDF)',
        create: 'Create guide'
      },

      pdf: {
        orUpload: 'Or upload a PDF',
        select: 'Select PDF',
        iframeTitle: 'Document',
        fileLabelSuffix: 'PDF'
      },

      articles: {
        title: 'Featured articles',
        reading: '{m} min read'
      },

      edit: {
        video: 'Edit video',
        book: 'Edit book',
        guide: 'Edit guide'
      },

      delete: {
        title: 'Delete {item}',
        text: 'Are you sure you want to delete',
        labels: {
          video: 'video',
          book: 'book',
          guide: 'guide'
        }
      },

      toasts: {
        uploadPdfError: 'Error uploading the PDF.',
        loadVideosError: 'Error loading videos.',
        loadLibraryError: 'Error loading the library.',
        loadGuidesError: 'Error loading guides.',
        videoRequired: 'Title and video file are required.',
        videoCreateError: 'There was a problem creating the video.',
        videoCreated: 'Video created successfully.',
        bookRequired: 'Title and book file (path or PDF) are required.',
        bookCreateError: 'There was a problem creating the book.',
        bookCreated: 'Book created successfully.',
        guideRequired: 'Title and guide file (path or PDF) are required.',
        guideCreateError: 'There was a problem creating the guide.',
        guideCreated: 'Guide created successfully.',
        editRequired: 'Title and file are required.',
        videoEdited: 'Video updated successfully.',
        bookEdited: 'Book updated successfully.',
        guideEdited: 'Guide updated successfully.',
        saveError: 'Error saving changes.',
        deleted: 'Content deleted successfully.'
      }
    }
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'es-AR',
  messages,
  globalInjection: true
})

// Setear lang del documento al cargar:
document.documentElement.lang = defaultLocale

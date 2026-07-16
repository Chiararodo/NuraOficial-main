import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    '❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.seed'
  )
  process.exit(1)
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const DEMO_PASSWORD = 'NuraDemo2026!'

const demoUsers = [
  {
    email: 'sofia.martinez.demo@nura.app',
    fullName: 'Sofía Martínez',
    avatarUrl: null,
    forum: {
      title: '¿Qué les ayuda cuando sienten mucha ansiedad?',
      body:
        'En los últimos días estuve intentando prestar más atención a las señales de mi cuerpo. Respirar lento y escribir lo que siento me ayuda un poco. ¿Qué recursos usan ustedes cuando aparece la ansiedad?',
      category: 'Ansiedad'
    }
  },
  {
    email: 'martina.lopez.demo@nura.app',
    fullName: 'Martina López',
    avatarUrl: null,
    forum: {
      title: 'Aprender a reconocer los pequeños avances',
      body:
        'Muchas veces me cuesta valorar los cambios pequeños porque siento que no son suficientes. Esta semana pude hablarme con más paciencia y quería compartirlo. ¿También les pasa?',
      category: 'Autoestima'
    }
  },
  {
    email: 'tomas.fernandez.demo@nura.app',
    fullName: 'Tomás Fernández',
    avatarUrl: null,
    forum: {
      title: 'Ideas para organizar las comidas con menos presión',
      body:
        'Estoy intentando organizar mejor mis horarios sin convertir cada comida en una obligación. Me serviría conocer estrategias simples que les hayan resultado útiles.',
      category: 'Alimentación'
    }
  },
  {
    email: 'valentina.ruiz.demo@nura.app',
    fullName: 'Valentina Ruiz',
    avatarUrl: null,
    forum: {
      title: '¿Cómo frenan los pensamientos negativos?',
      body:
        'Hay días en los que me cuesta mucho cortar con pensamientos negativos sobre mí misma. Estoy practicando escribir algo bueno que hice durante el día. ¿Qué herramientas usan ustedes?',
      category: 'Autoestima'
    }
  },
  {
    email: 'lucas.romero.demo@nura.app',
    fullName: 'Lucas Romero',
    avatarUrl: null,
    forum: {
      title: 'Volver a la rutina después de una semana difícil',
      body:
        'Después de varios días desordenados me cuesta retomar mis hábitos sin exigirme demasiado. Quiero empezar con objetivos pequeños y posibles. ¿Cómo hacen para volver de a poco?',
      category: 'Ansiedad'
    }
  },
  {
    email: 'camila.benitez.demo@nura.app',
    fullName: 'Camila Benítez',
    avatarUrl: null,
    forum: {
      title: 'Comer con más atención y menos culpa',
      body:
        'Estoy intentando escuchar más el hambre y la saciedad sin juzgar cada decisión. Me gustaría saber qué cosas les ayudan a tener una relación más tranquila con la alimentación.',
      category: 'Alimentación'
    }
  }
]

const demoComments = [
  {
    authorEmail: 'martina.lopez.demo@nura.app',
    forumOwnerEmail: 'sofia.martinez.demo@nura.app',
    body:
      'A mí me ayuda salir unos minutos al aire libre y concentrarme en lo que veo y escucho. No siempre elimina la ansiedad, pero me permite bajar un poco la intensidad.'
  },
  {
    authorEmail: 'lucas.romero.demo@nura.app',
    forumOwnerEmail: 'sofia.martinez.demo@nura.app',
    body:
      'Estoy usando una respiración lenta: inhalo cuatro segundos y exhalo seis. También trato de recordarme que la sensación va a pasar.'
  },
  {
    authorEmail: 'sofia.martinez.demo@nura.app',
    forumOwnerEmail: 'martina.lopez.demo@nura.app',
    body:
      'Sí, me pasa mucho. A veces anoto un avance pequeño al final del día para no olvidarme de que también cuenta.'
  },
  {
    authorEmail: 'valentina.ruiz.demo@nura.app',
    forumOwnerEmail: 'martina.lopez.demo@nura.app',
    body:
      'Me gustó la idea de hablarse con más paciencia. Estoy intentando tratarme como trataría a una amiga.'
  },
  {
    authorEmail: 'camila.benitez.demo@nura.app',
    forumOwnerEmail: 'tomas.fernandez.demo@nura.app',
    body:
      'Me ayuda tener algunas opciones simples disponibles, pero sin planificar todo de manera rígida. Así puedo adaptarme según cómo esté ese día.'
  },
  {
    authorEmail: 'tomas.fernandez.demo@nura.app',
    forumOwnerEmail: 'camila.benitez.demo@nura.app',
    body:
      'Estoy trabajando en no clasificar los alimentos como buenos o malos. Eso me permite tomar decisiones con menos culpa.'
  },
  {
    authorEmail: 'sofia.martinez.demo@nura.app',
    forumOwnerEmail: 'valentina.ruiz.demo@nura.app',
    body:
      'Cuando aparece un pensamiento negativo intento preguntarme si realmente tengo pruebas de que sea cierto. A veces eso me ayuda a tomar distancia.'
  },
  {
    authorEmail: 'martina.lopez.demo@nura.app',
    forumOwnerEmail: 'lucas.romero.demo@nura.app',
    body:
      'A mí me funciona elegir una sola cosa para retomar primero. Cuando intento cambiar todo el mismo día termino frustrándome.'
  }
]

async function findUserByEmail(email) {
  let page = 1

  while (true) {
    const { data, error } =
      await supabase.auth.admin.listUsers({
        page,
        perPage: 100
      })

    if (error) throw error

    const found = data.users.find(
      (user) =>
        user.email?.toLowerCase() === email.toLowerCase()
    )

    if (found) return found

    if (data.users.length < 100) return null

    page += 1
  }
}

async function createOrFindUser(demo) {
  const existing = await findUserByEmail(demo.email)

  if (existing) {
    console.log(`ℹ️ Usuario existente: ${demo.fullName}`)
    return existing
  }

  const { data, error } =
    await supabase.auth.admin.createUser({
      email: demo.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name: demo.fullName,
        full_name: demo.fullName,
        is_demo: true
      }
    })

  if (error) throw error

  console.log(`✅ Usuario creado: ${demo.fullName}`)
  return data.user
}

async function upsertProfile(user, demo) {
  const profile = {
    id: user.id,

    /*
     * Tu tabla tiene name y full_name.
     * Guardamos ambos para mantener compatibilidad.
     */
    name: demo.fullName,
    full_name: demo.fullName,

    email: demo.email,
    avatar_url: demo.avatarUrl,

    premium: true,
    plan: 'premium',
    is_demo: true,

    is_admin: false,
    blocked: false,
    is_blocked: false,
    deleted_at: null
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(profile, {
      onConflict: 'id'
    })

  if (error) {
    throw new Error(
      `Error creando el perfil de ${demo.fullName}: ${error.message}`
    )
  }

  console.log(`✅ Perfil preparado: ${demo.fullName}`)
}

async function createForumIfMissing(user, demo) {
  const { data: existing, error: searchError } =
    await supabase
      .from('forums')
      .select('id')
      .eq('user_id', user.id)
      .eq('title', demo.forum.title)
      .maybeSingle()

  if (searchError) throw searchError

  if (existing) {
    console.log(`ℹ️ Foro existente: ${demo.forum.title}`)
    return existing.id
  }

  const { data, error } = await supabase
    .from('forums')
    .insert({
      user_id: user.id,
      title: demo.forum.title,
      body: demo.forum.body,
      category: demo.forum.category
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(
      `Error creando el foro de ${demo.fullName}: ${error.message}`
    )
  }

  console.log(`✅ Foro creado por ${demo.fullName}`)
  return data.id
}

async function createCommentIfMissing({
  forumId,
  authorId,
  authorName,
  body
}) {
  const { data: existing, error: searchError } =
    await supabase
      .from('forum_comments')
      .select('id')
      .eq('forum_id', forumId)
      .eq('user_id', authorId)
      .eq('body', body)
      .maybeSingle()

  if (searchError) throw searchError

  if (existing) {
    console.log(`ℹ️ Comentario existente de ${authorName}`)
    return
  }

  const { error } = await supabase
    .from('forum_comments')
    .insert({
      forum_id: forumId,
      user_id: authorId,
      body
    })

  if (error) {
    throw new Error(
      `Error creando comentario de ${authorName}: ${error.message}`
    )
  }

  console.log(`✅ Comentario creado por ${authorName}`)
}

async function runSeed() {
  console.log('🌱 Iniciando usuarios y contenido demo…')

  const usersByEmail = new Map()
  const forumsByOwnerEmail = new Map()
  const namesByEmail = new Map()

  for (const demo of demoUsers) {
    const user = await createOrFindUser(demo)

    await upsertProfile(user, demo)

    const forumId = await createForumIfMissing(user, demo)

    usersByEmail.set(demo.email, user)
    forumsByOwnerEmail.set(demo.email, forumId)
    namesByEmail.set(demo.email, demo.fullName)
  }

  console.log('💬 Creando comentarios demo…')

  for (const comment of demoComments) {
    const author =
      usersByEmail.get(comment.authorEmail)

    const forumId =
      forumsByOwnerEmail.get(comment.forumOwnerEmail)

    if (!author || !forumId) {
      console.warn(
        '⚠️ No se encontró el autor o el foro para un comentario.'
      )
      continue
    }

    await createCommentIfMissing({
      forumId,
      authorId: author.id,
      authorName:
        namesByEmail.get(comment.authorEmail) ||
        comment.authorEmail,
      body: comment.body
    })
  }

  console.log('🎉 Usuarios, foros y comentarios creados.')
  console.log(`🔑 Contraseña demo: ${DEMO_PASSWORD}`)
}

runSeed().catch((error) => {
  console.error('❌ Error general del seed:', error)
  process.exit(1)
})
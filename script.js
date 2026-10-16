// RR Studio: interacciones locales con JavaScript puro.
const uno = (selector, raiz = document) => raiz.querySelector(selector);
const varios = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];

// Menú adaptable para todas las páginas.
const botonMenu = uno("#menuBoton");
const menu = uno("#menu");
if (botonMenu && menu) {
  botonMenu.addEventListener("click", () => {
    const abierto = menu.classList.toggle("abierto");
    botonMenu.setAttribute("aria-expanded", String(abierto));
    botonMenu.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
  });
  varios("#menu a", menu).forEach(enlace => enlace.addEventListener("click", () => {
    menu.classList.remove("abierto");
    botonMenu.setAttribute("aria-expanded", "false");
    botonMenu.setAttribute("aria-label", "Abrir menú");
  }));
}


// Navegación robusta del desplegable «Explorar» en escritorio y móvil.
// No se cancela el comportamiento normal de los enlaces: cada href abre su página.
document.querySelectorAll(".menuMas").forEach(desplegable => {
  const resumen = desplegable.querySelector("summary");
  const lista = desplegable.querySelector(".menuMasLista");
  if (!resumen || !lista) return;
  resumen.setAttribute("aria-haspopup", "true");
  resumen.setAttribute("aria-expanded", String(desplegable.open));
  desplegable.addEventListener("toggle", () => {
    resumen.setAttribute("aria-expanded", String(desplegable.open));
  });
  lista.querySelectorAll("a[href]").forEach(enlace => {
    enlace.addEventListener("click", evento => {
      const destino = enlace.getAttribute("href");
      if (!destino || destino.startsWith("#") || evento.defaultPrevented) return;
      // Asegura que el enlace tenga un destino local explícito, sin bloquear el clic.
      enlace.setAttribute("href", destino.replace(/^\.\//, ""));
      desplegable.open = false;
    });
  });
});

// Ventanas de información para los proyectos.
const fondoModal = uno("#modalFondo");
function abrirModal(titulo, texto) {
  if (!fondoModal) return;
  uno("#modalTitulo").textContent = titulo;
  uno("#modalTexto").textContent = texto;
  fondoModal.classList.add("abierto");
  uno("#cerrarModal")?.focus();
}
function cerrarModal() {
  if (!fondoModal) return;
  fondoModal.classList.remove("abierto");
}
varios(".detalleBoton").forEach(boton => boton.addEventListener("click", () => abrirModal(boton.dataset.titulo, boton.dataset.texto)));
varios(".detalleVisual").forEach(visual => {
  const mostrar = () => abrirModal(visual.dataset.titulo, visual.dataset.texto);
  visual.addEventListener("click", mostrar);
  visual.addEventListener("keydown", evento => {
    if (evento.key === "Enter" || evento.key === " ") { evento.preventDefault(); mostrar(); }
  });
});
const cerrar = uno("#cerrarModal");
if (cerrar) cerrar.addEventListener("click", cerrarModal);
if (fondoModal) fondoModal.addEventListener("click", evento => { if (evento.target === fondoModal) cerrarModal(); });
document.addEventListener("keydown", evento => { if (evento.key === "Escape") cerrarModal(); });

// Formularios: guardan los registros en el almacenamiento local del navegador.
function guardarEnvioFormulario(tipo, formulario) {
  const campos = Object.fromEntries(new FormData(formulario).entries());
  const nombre = campos.nombre || "Sin nombre";
  const correo = campos.correo || "Sin correo";
  const detalle = `${tipo} | Correo: ${correo} | ${Object.entries(campos).filter(([clave]) => !["nombre", "correo"].includes(clave)).map(([clave, valor]) => `${clave}: ${valor}`).join(" | ")}`;
  try {
    const datos = JSON.parse(localStorage.getItem("rrStudioDatos") || "{}");
    if (!Array.isArray(datos.mensajes)) datos.mensajes = [];
    datos.mensajes.unshift({nombre, correo, detalle, fecha: new Date().toLocaleString("es-CO"), leido:false});
    localStorage.setItem("rrStudioDatos", JSON.stringify(datos));
    return true;
  } catch { return false; }
}
function activarFormulario(id, tipo, mensaje) {
  const formulario = uno(id);
  if (!formulario) return;
  formulario.addEventListener("submit", evento => {
    evento.preventDefault();
    if (!formulario.reportValidity()) return;
    const guardado = guardarEnvioFormulario(tipo, formulario);
    const resultado = uno(".resultado", formulario);
    if (resultado) {
      resultado.textContent = guardado ? mensaje : "No se pudo guardar. Revisa la configuración del navegador.";
      resultado.setAttribute("role", "status");
    }
    if (guardado) formulario.reset();
  });
}
activarFormulario("#formContacto", "Mensaje de contacto", "✓ Mensaje guardado. Puedes verlo en el Panel de administración, sección Mensajes.");

// Seleccionar automáticamente un área de interés al pulsar una oportunidad.
varios(".trabajoOpcion").forEach(boton => boton.addEventListener("click", () => {
  const selector = uno('select[name="area"]');
  if (selector) {
    const opcion = [...selector.options].find(op => op.value === boton.dataset.area || op.textContent === boton.dataset.area);
    if (opcion) selector.value = opcion.value;
    uno("#formTrabajo")?.scrollIntoView({behavior:"smooth", block:"center"});
  }
}));

// Asistente de respuestas programadas para la página de IA.
function responder(pregunta) {
  const texto = pregunta.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const respuestas = [
    {claves:["inicio", "portada", "pagina principal", "home"], respuesta:"Inicio es la portada de RR. Presenta qué hace el estudio, permite explorar una maqueta interactiva de los servicios y dirige a Servicios, Proyectos y Contacto."},
    {claves:["nosotros", "historia", "mision", "vision", "quienes son", "quienes somos"], respuesta:"Nosotros explica quién está detrás de RR dentro de este proyecto demostrativo, su historia, misión, visión y principios de trabajo. Sirve para entender el propósito y la forma de pensar del estudio."},
    {claves:["servicios", "ofrecen", "que hacen", "que ofrece"], respuesta:"Servicios reúne las áreas que explora RR: desarrollo web, aplicaciones móviles, inteligencia artificial y soluciones digitales. Desde allí puedes entrar a cada área para conocerla con más detalle."},
    {claves:["desarrollo web", "pagina web", "sitio web", "web"], respuesta:"Desarrollo web explica cómo se puede crear un sitio o plataforma: estructura de páginas, diseño adaptable, navegación, formularios y organización de contenido. Es una página informativa de ejemplo; no es un constructor automático de sitios."},
    {claves:["desarrollo movil", "aplicacion movil", "aplicaciones moviles", "app", "celular"], respuesta:"Desarrollo móvil presenta la idea de una aplicación para celular, sus pantallas y las decisiones que ayudan a que sea fácil de usar. El prototipo es visual y no se instala como una app real."},
    {claves:["proyectos", "portafolio", "clientes", "nova", "orbit", "bloom"], respuesta:"Proyectos es el portafolio conceptual. NOVA representa una tienda digital con catálogo; ORBIT, un panel para organizar tareas y avances; y Bloom, una app para crear rutinas personales. En cada caso puedes abrir 'Explorar el caso' para ver el problema, la solución propuesta y las funciones. Son conceptos ficticios, no clientes reales."},
    {claves:["inteligencia artificial", "ia", "asistente", "esta pagina", "esta pagina de ia"], respuesta:"Esta página explica el uso de inteligencia artificial y contiene este asistente de orientación. Puedes preguntarme por las secciones de RR y te explicaré qué hace cada una. Importante: aquí las respuestas están programadas; no soy una IA conectada a un modelo externo."},
    {claves:["contacto", "correo", "mensaje", "escribir", "formulario"], respuesta:"Contacto permite revisar un formulario de ejemplo para escribir el nombre, correo y mensaje. En esta versión solo valida los campos: no envía el mensaje porque el proyecto no tiene servidor conectado."},
    {claves:["trabaja", "trabajar", "empleo", "oportunidades", "hoja de vida", "curriculum"], respuesta:"Trabaja con nosotros presenta oportunidades y un formulario demostrativo para elegir un área de interés y compartir datos. Es una maqueta: no recibe ni almacena postulaciones reales."},
    {claves:["administracion", "admin", "panel", "gestionar", "gestiona"], respuesta:"El Panel de administración es una simulación para explorar cómo se podrían organizar proyectos, clientes, servicios y mensajes. Los cambios se guardan localmente en ese navegador; no hay servidor, inicio de sesión ni seguridad real. No introduzcas información privada."},
    {claves:["seguridad", "datos", "guarda", "guardar", "se envia", "envia", "real"], respuesta:"RR es un proyecto demostrativo. Algunos cambios del panel se guardan solo en el navegador, pero los formularios no envían información a un servidor. No uses datos privados ni contraseñas en esta maqueta."},
    {claves:["precio", "cuanto cuesta", "contratar", "presupuesto"], respuesta:"La web muestra ideas y servicios de ejemplo, pero no tiene precios ni contratación real configurados. Puedes usar Contacto para explorar el formulario demostrativo."}
  ];
  for (const grupo of respuestas) {
    if (grupo.claves.some(clave => texto.includes(clave))) return grupo.respuesta;
  }
  return "Puedo orientarte por las páginas de RR. Pregúntame '¿Qué hace Proyectos?', '¿Qué hay en Desarrollo web?', '¿Para qué sirve el panel?' o elige una de las opciones de esta pantalla. Esta versión usa respuestas programadas y solo explica el contenido de esta web.";
}
function agregarMensaje(contenedor, texto, clase) {
  const mensaje = document.createElement("div");
  mensaje.className = `mensaje ${clase}`;
  mensaje.textContent = texto;
  contenedor.appendChild(mensaje);
  contenedor.scrollTop = contenedor.scrollHeight;
}
const formularioIA = uno("#formIA");
if (formularioIA) {
  const entrada = uno("#entradaIA");
  const mensajes = uno("#mensajesIA");
  function enviarIA(texto = entrada.value) {
    texto = texto.trim();
    if (!texto) return;
    agregarMensaje(mensajes, texto, "usuario");
    agregarMensaje(mensajes, responder(texto), "bot");
    entrada.value = "";
  }
  formularioIA.addEventListener("submit", evento => { evento.preventDefault(); enviarIA(); });
  varios("[data-pregunta]").forEach(boton => boton.addEventListener("click", () => enviarIA(boton.dataset.pregunta)));
}

// Contadores animados en la página de clientes: cifras ilustrativas.
const contadores = varios("[data-contador]");
if (contadores.length) {
  const observador = new IntersectionObserver(entradas => {
    entradas.forEach(entrada => {
      if (!entrada.isIntersecting) return;
      const elemento = entrada.target;
      const meta = Number(elemento.dataset.contador);
      let actual = 0;
      const paso = Math.max(1, Math.ceil(meta / 25));
      const temporizador = setInterval(() => {
        actual = Math.min(meta, actual + paso);
        elemento.textContent = actual;
        if (actual >= meta) clearInterval(temporizador);
      }, 35);
      observador.unobserve(elemento);
    });
  }, {threshold:.5});
  contadores.forEach(contador => observador.observe(contador));
}

// Panel administrativo: bandeja de entrada alimentada únicamente por el formulario Contacto.
const areaAdmin = uno("#contenidoAdmin");
if (areaAdmin) {
  const datosIniciales = {proyectos:[], clientes:[], servicios:[], mensajes:[]};
  let datos;
  try {
    const guardado = JSON.parse(localStorage.getItem("rrStudioDatos") || "null");
    datos = guardado && typeof guardado === "object" ? {...datosIniciales, ...guardado} : {...datosIniciales};
    if (!Array.isArray(datos.mensajes)) datos.mensajes = [];
    // El panel muestra exclusivamente envíos de Contacto; excluye solicitudes de otras páginas.
    datos.mensajes = datos.mensajes.filter(m => String(m.detalle || "").startsWith("Mensaje de contacto"));
  } catch { datos = {...datosIniciales}; }
  let pestaña = "resumen";
  let filtroEstado = "todos";
  const titulos = {resumen:"Resumen de mensajes", mensajes:"Bandeja de mensajes"};
  function guardar() { try { localStorage.setItem("rrStudioDatos", JSON.stringify(datos)); } catch {} }
  function seguro(valor) { return String(valor ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function actualizarContador() {
    const contador = uno('[data-tab="mensajes"] i');
    if (contador) { contador.textContent = datos.mensajes.filter(m => !m.leido).length; contador.style.opacity = "1"; }
  }
  function renderizar() {
    uno("#tituloAdmin").textContent = titulos[pestaña];
    varios(".pestana").forEach(b => b.classList.toggle("activa", b.dataset.tab === pestaña));
    const noLeidos = datos.mensajes.filter(m => !m.leido).length;
    if (pestaña === "resumen") {
      areaAdmin.innerHTML = `<p class="adminNota">Todo lo que aparece aquí procede del formulario de Contacto. No se pueden crear mensajes manualmente.</p>
      <div class="adminEstadisticas">
       <article class="adminEstadistica"><small>Mensajes recibidos</small><strong>${datos.mensajes.length}</strong><span>Total guardado en este navegador</span></article>
       <article class="adminEstadistica"><small>Sin leer</small><strong>${noLeidos}</strong><span>Requieren revisión</span></article>
       <article class="adminEstadistica"><small>Leídos</small><strong>${datos.mensajes.length-noLeidos}</strong><span>Mensajes ya revisados</span></article>
      </div>
      <div class="adminCaja adminBienvenida"><div><span class="adminResumenIcono">✉</span><div><h3>Tu bandeja de entrada</h3><p class="adminNota">Envía un mensaje de prueba desde Contacto y aparecerá aquí. Puedes buscar, marcar como leído, consultar detalles o eliminar mensajes.</p></div></div><button class="boton botonCian" id="abrirMensajes" type="button">Ver mensajes →</button></div>
      <div class="adminCaja"><h3>Cómo probarlo</h3><ol class="adminPasos"><li>Abre <a href="contacto.html">Contacto</a> en otra pestaña.</li><li>Completa el formulario con datos de prueba y envíalo.</li><li>Vuelve aquí y pulsa “Actualizar mensajes”.</li></ol></div>`;
      uno("#abrirMensajes").addEventListener("click", () => {pestaña="mensajes";renderizar();});
      actualizarContador(); return;
    }
    areaAdmin.innerHTML = `<p class="adminNota">Solo mensajes enviados desde el formulario de Contacto.</p>
      <div class="adminMensajesControles"><input id="buscarRegistro" type="search" placeholder="Buscar por nombre, correo o mensaje…" aria-label="Buscar mensajes"><select id="filtroEstado" aria-label="Filtrar por estado"><option value="todos">Todos los mensajes</option><option value="nuevos">Sin leer</option><option value="leidos">Leídos</option></select><button class="boton botonBorde" id="exportarMensajes" type="button">↓ Exportar CSV</button></div>
      <div class="adminMensajesLista" id="filasAdmin"></div><p class="adminVacioAyuda">Los mensajes se guardan localmente en este navegador, no en un servidor.</p>`;
    const lista = uno("#filasAdmin");
    function dibujar() {
      const q = uno("#buscarRegistro").value.toLocaleLowerCase(); filtroEstado = uno("#filtroEstado").value;
      const items = datos.mensajes.map((m,i)=>({...m,indice:i})).filter(m => {
        const texto = `${m.nombre||""} ${m.detalle||""} ${m.correo||""}`.toLocaleLowerCase();
        return texto.includes(q) && (filtroEstado==="todos" || (filtroEstado==="nuevos" && !m.leido) || (filtroEstado==="leidos" && m.leido));
      });
      lista.innerHTML = items.length ? items.map(m => `<article class="adminMensajeCard ${m.leido?'mensajeLeido':'mensajeNuevo'}"><div class="adminMensajeCabecera"><div class="adminMensajeAvatar">${seguro((m.nombre||'?').trim().charAt(0).toUpperCase())}</div><div class="adminMensajeIdentidad"><h3>${seguro(m.nombre||'Sin nombre')}</h3><small>${seguro(m.fecha||'Fecha no disponible')}</small></div><span class="adminMensajeEstado">${m.leido?'LEÍDO':'NUEVO'}</span></div><p class="adminMensajeExtracto">${seguro((m.detalle||'').replace(/^Mensaje de contacto\s*\|\s*/,''))}</p><div class="adminMensajeAcciones"><button type="button" data-detalle="${m.indice}">Ver detalles</button><button type="button" data-leido="${m.indice}">${m.leido?'Marcar sin leer':'Marcar leído'}</button><button type="button" class="accionEliminar" data-borrar="${m.indice}">Eliminar</button></div><div class="adminMensajeDetalle" id="detalle-${m.indice}" hidden>${seguro(m.detalle||'Sin contenido adicional')}</div></article>`).join("") : `<div class="adminCaja adminSinMensajes"><span>✉</span><h3>${q||filtroEstado!=='todos'?'No hay coincidencias':'Todavía no hay mensajes'}</h3><p>${q||filtroEstado!=='todos'?'Prueba con otra búsqueda o cambia el filtro.':'Cuando alguien envíe el formulario de Contacto, aparecerá aquí.'}</p><a class="boton botonCian" href="contacto.html">Ir al formulario</a></div>`;
      varios("[data-detalle]",lista).forEach(b=>b.addEventListener("click",()=>{const d=uno(`#detalle-${b.dataset.detalle}`,lista);d.hidden=!d.hidden;b.textContent=d.hidden?'Ver detalles':'Ocultar detalles';}));
      varios("[data-leido]",lista).forEach(b=>b.addEventListener("click",()=>{const m=datos.mensajes[Number(b.dataset.leido)];m.leido=!m.leido;guardar();renderizar();}));
      varios("[data-borrar]",lista).forEach(b=>b.addEventListener("click",()=>{if(!confirm('¿Eliminar este mensaje de este navegador?'))return;datos.mensajes.splice(Number(b.dataset.borrar),1);guardar();renderizar();}));
      actualizarContador();
    }
    uno("#buscarRegistro").addEventListener("input",dibujar);uno("#filtroEstado").addEventListener("change",dibujar);
    uno("#exportarMensajes").addEventListener("click",()=>{if(!datos.mensajes.length){alert('Todavía no hay mensajes para exportar.');return;}const csv=[['Nombre','Fecha','Mensaje','Estado'],...datos.mensajes.map(m=>[m.nombre,m.fecha,m.detalle,m.leido?'Leído':'Nuevo'])].map(fila=>fila.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='mensajes-rr-studio.csv';a.click();URL.revokeObjectURL(url);});
    dibujar();
  }
  varios(".pestana").forEach(b=>b.addEventListener("click",()=>{pestaña=b.dataset.tab;renderizar();}));
  const actualizar = uno("#agregarAdmin"); if(actualizar) actualizar.addEventListener("click",()=>{try{const guardado=JSON.parse(localStorage.getItem("rrStudioDatos")||"{}");datos.mensajes=Array.isArray(guardado.mensajes)?guardado.mensajes.filter(m=>String(m.detalle||"").startsWith("Mensaje de contacto")):[];}catch{}renderizar();actualizar.textContent="✓ Actualizado";setTimeout(()=>actualizar.textContent="↻ Actualizar mensajes",1300);});
  renderizar();
}

// Portada: menú pequeño y demostración de celular que responde al tocar opciones.
(function () {
  const botonMenuPortada = uno("#menuPortadaBoton");
  const enlacesPortada = uno(".enlacesPortada");
  if (botonMenuPortada && enlacesPortada) {
    botonMenuPortada.addEventListener("click", () => {
      const abierto = enlacesPortada.classList.toggle("abierto");
      botonMenuPortada.setAttribute("aria-expanded", String(abierto));
      botonMenuPortada.textContent = abierto ? "×" : "☰";
    });
  }

  const vistas = {
    web: {etiqueta:"DESARROLLO WEB", titulo:"¿Qué te gustaría crear?", texto:"Selecciona una opción para ver un ejemplo."},
    movil: {etiqueta:"APLICACIONES MÓVILES", titulo:"Una app para tu proyecto", texto:"Un ejemplo de cómo presentar servicios desde el celular."},
    ia: {etiqueta:"INTELIGENCIA ARTIFICIAL", titulo:"Automatizar tareas", texto:"Herramientas que pueden ayudar con tareas repetitivas."}
  };
  const titulo = uno("#demoTitulo");
  const etiqueta = uno("#demoEtiqueta");
  const texto = uno("#demoTexto");
  let textoVistaActual = texto ? texto.textContent : "";
  const opciones = varios("[data-vista]");
  opciones.forEach(opcion => opcion.addEventListener("click", () => {
    const vista = vistas[opcion.dataset.vista];
    if (!vista) return;
    opciones.forEach(item => {
      item.classList.toggle("seleccionada", item === opcion);
      item.setAttribute("aria-pressed", String(item === opcion));
    });
    titulo.textContent = vista.titulo;
    etiqueta.textContent = vista.etiqueta;
    texto.textContent = vista.texto;
    textoVistaActual = vista.texto;
    const menuAyuda = uno("#appMenu");
    if (menuAyuda) menuAyuda.setAttribute("aria-expanded", "false");
    const pantalla = uno(".telefonoPantalla");
    if (pantalla) {
      pantalla.animate([{opacity:.55, transform:"translateY(5px)"},{opacity:1, transform:"translateY(0)"}], {duration:220, easing:"ease-out"});
    }
  }));
  const menuApp = uno("#appMenu");
  if (menuApp) menuApp.addEventListener("click", () => {
    const ayuda = uno("#demoTexto");
    const abierto = menuApp.getAttribute("aria-expanded") !== "true";
    menuApp.setAttribute("aria-expanded", String(abierto));
    if (ayuda) ayuda.textContent = abierto
      ? "Toca una opción para ver un ejemplo."
      : textoVistaActual;
  });
})();


// Slider de destacados: controles manuales, puntos y avance automático.
(function () {
  const slider = document.querySelector('.proyectosSlider');
  if (!slider) return;
  const paneles = Array.from(slider.querySelectorAll('[data-slide]'));
  const puntos = Array.from(slider.querySelectorAll('[data-ir-slide]'));
  const estado = slider.querySelector('#sliderEstado');
  const anterior = slider.querySelector('#sliderAnterior');
  const siguiente = slider.querySelector('#sliderSiguiente');
  if (!paneles.length || !puntos.length) return;
  let actual = 0;
  let intervalo;
  const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function mostrar(indice) {
    actual = (indice + paneles.length) % paneles.length;
    paneles.forEach((panel, i) => panel.classList.toggle('activo', i === actual));
    puntos.forEach((punto, i) => {
      punto.classList.toggle('activo', i === actual);
      punto.setAttribute('aria-pressed', String(i === actual));
    });
    if (estado) estado.textContent = `0${actual + 1} / 0${paneles.length}`;
  }
  function iniciar() {
    clearInterval(intervalo);
    if (!movimientoReducido) intervalo = setInterval(() => mostrar(actual + 1), 6500);
  }
  anterior?.addEventListener('click', () => { mostrar(actual - 1); iniciar(); });
  siguiente?.addEventListener('click', () => { mostrar(actual + 1); iniciar(); });
  puntos.forEach(punto => punto.addEventListener('click', () => { mostrar(Number(punto.dataset.irSlide)); iniciar(); }));
  slider.addEventListener('mouseenter', () => clearInterval(intervalo));
  slider.addEventListener('mouseleave', iniciar);
  slider.addEventListener('focusin', () => clearInterval(intervalo));
  slider.addEventListener('focusout', iniciar);
  mostrar(0);
  iniciar();
})();

// Prototipo de celular: los elementos responden al toque y cambian el contenido.
(function () {
  const pantalla = uno('.telefonoPremium');
  if (!pantalla) return;
  const titulo = uno('#telefonoTitulo', pantalla);
  const subtitulo = uno('#telefonoSubtitulo', pantalla);
  const saludo = uno('#saludoAppTexto', pantalla);
  const aviso = uno('#telefonoToast', pantalla);
  const botonesNav = varios('[data-phone-tab]', pantalla);
  const vistas = {
    inicio: {titulo:'Haz que tus<br>ideas sucedan.', subtitulo:'Descubrir espacio ', saludo:'¿Qué vamos a crear hoy?', aviso:'Inicio: aquí encontrarías un resumen de tu espacio.'},
    proyectos: {titulo:'Tus proyectos<br>en un solo lugar.', subtitulo:'Ver proyectos ', saludo:'Tus ideas van tomando forma.', aviso:'Proyectos: consulta avances y tareas pendientes.'},
    ideas: {titulo:'Guarda cada<br>buena idea.', subtitulo:'Abrir mis ideas ', saludo:'No pierdas ninguna idea.', aviso:'Ideas: aquí puedes reunir notas e inspiración.'},
    perfil: {titulo:'Tu espacio,<br>a tu manera.', subtitulo:'Ver perfil ', saludo:'Personaliza tu experiencia.', aviso:'Perfil: aquí estarían tus preferencias y datos de cuenta.'},
    enfoque: {titulo:'Un paso a la<br>vez.', subtitulo:'Ver mi enfoque ', saludo:'Organiza tu próxima tarea.', aviso:'Enfoque: divide el trabajo en tareas pequeñas y claras.'}
  };
  let avisoTemporizador;
  function mostrarAviso(mensaje) {
    if (!aviso) return;
    aviso.textContent = mensaje;
    aviso.classList.add('visible');
    clearTimeout(avisoTemporizador);
    avisoTemporizador = setTimeout(() => aviso.classList.remove('visible'), 3200);
  }
  function cambiarVista(nombre) {
    const vista = vistas[nombre];
    if (!vista) return;
    if (titulo) titulo.innerHTML = vista.titulo;
    if (subtitulo) subtitulo.textContent = vista.subtitulo;
    if (saludo) saludo.textContent = vista.saludo;
    botonesNav.forEach(boton => boton.classList.toggle('navActivo', boton.dataset.phoneTab === nombre || (nombre === 'enfoque' && boton.dataset.phoneTab === 'inicio')));
    mostrarAviso(vista.aviso);
  }
  botonesNav.forEach(boton => boton.addEventListener('click', () => cambiarVista(boton.dataset.phoneTab)));
  varios('[data-phone-action]', pantalla).forEach(boton => boton.addEventListener('click', () => {
    const acciones = {
      featured: 'Espacio digital: desde aquí podrías abrir tus accesos y tareas favoritas.',
      actividad: 'Actividad reciente: revisa las tareas que has actualizado últimamente.',
      tarea: 'Tarea seleccionada: “Organizar proyecto”. En una app real podrías marcarla como completada.',
      idea: 'Idea seleccionada: puedes abrirla para editarla o añadir más detalles.'
    };
    if (boton.dataset.phoneAction === 'featured') cambiarVista('proyectos');
    else mostrarAviso(acciones[boton.dataset.phoneAction] || 'Elemento seleccionado.');
  }));
})();

// Demo de desarrollo web: el botón de la maqueta alterna entre vistas de ejemplo.
(function () {
  const boton = uno('[data-web-demo]');
  if (!boton) return;
  const titulo = uno('.browserMain h2');
  const texto = uno('[data-web-demo-text]');
  const ejemplos = [
    {titulo:'Less noise.<br><em>More meaning.</em>', texto:'Una experiencia digital pensada para destacar.', boton:'Explorar '},
    {titulo:'Todo claro.<br><em>Todo cerca.</em>', texto:'Una navegación sencilla que ayuda a encontrar lo importante.', boton:'Ver catálogo '},
    {titulo:'Diseño útil.<br><em>Mejor recorrido.</em>', texto:'Cada sección tiene un objetivo y una acción fácil de entender.', boton:'Volver al inicio '}
  ];
  let actual = 0;
  boton.addEventListener('click', () => {
    actual = (actual + 1) % ejemplos.length;
    titulo.innerHTML = ejemplos[actual].titulo;
    texto.textContent = ejemplos[actual].texto;
    boton.textContent = ejemplos[actual].boton;
    const panel = uno('[data-web-demo-panel]');
    if (panel && panel.animate) panel.animate([{opacity:.55, transform:'translateY(5px)'},{opacity:1, transform:'translateY(0)'}], {duration:220, easing:'ease-out'});
  });
})();

// Ejemplos prácticos en la página de inteligencia artificial; no llama a servicios externos.
(function () {
  const resultado = uno('#iaEjemploResultado');
  if (!resultado) return;
  const ejemplos = {
    organizar: 'Ejemplo: una lista de tareas se puede agrupar por fecha, prioridad y estado para saber por dónde empezar.',
    resumir: 'Ejemplo: un texto largo se puede convertir en una lista de ideas principales que después debe revisar una persona.',
    consultar: 'Ejemplo: una guía puede responder preguntas frecuentes sobre horarios, servicios o pasos de un proceso.'
  };
  varios('[data-ia-ejemplo]').forEach(boton => boton.addEventListener('click', () => {
    varios('[data-ia-ejemplo]').forEach(opcion => opcion.classList.toggle('seleccionada', opcion === boton));
    resultado.textContent = ejemplos[boton.dataset.iaEjemplo] || 'Selecciona una tarea para ver un ejemplo.';
  }));
})();

// RR visual upgrade: reveal al desplazarse, brillo de tarjetas y progreso de lectura.
(function () {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const progress = document.createElement('div');
  progress.id = 'rrReadingProgress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  let scheduled = false;
  function updateProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    progress.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    scheduled = false;
  }
  window.addEventListener('scroll', () => {
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(updateProgress);
    }
  }, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  updateProgress();

  // Reveal solo en elementos visuales, sin ocultar navegación ni formularios.
  const revealSelector = [
    '.miniServicio', '.beneficioGrande', '.casoFicha', '.casoBloque', '.casoPaso',
    '.iaPuntoPanel', '.iaUsos > *', '.areaTexto', '.sliderEncabezado', '.sliderVentana',
    '.cabeceraSeccion', '.misionVision > *', '.nosotrosValores > *', '.contactoGrid > *',
    '.ctaFinal', '.franjaCta', '.estadisticas > *', '.guiaIA', '.iaNota', '.casoAviso'
  ].join(',');
  const revealItems = Array.from(document.querySelectorAll(revealSelector));
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('rr-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    revealItems.forEach(item => {
      item.classList.add('rr-reveal');
      observer.observe(item);
    });
  }

  // Destello interactivo siguiendo el puntero en tarjetas destacadas.
  const glowItems = document.querySelectorAll('.miniServicio, .beneficioGrande, .casoFicha, .casoBloque, .iaPuntoPanel, .appOpcion, .miniPanel');
  glowItems.forEach(item => {
    item.classList.add('rr-glow-card');
    item.addEventListener('pointermove', event => {
      const rect = item.getBoundingClientRect();
      item.style.setProperty('--rr-x', `${event.clientX - rect.left}px`);
      item.style.setProperty('--rr-y', `${event.clientY - rect.top}px`);
    }, { passive: true });
  });
})();


// RR Interactive Lab: cambia entre demos sin recargar la página.
(function(){
 const escenario=document.querySelector('#rrLabEscenario');
 if(!escenario)return;
 const datos={
  web:{titulo:'Una web con propósito.',texto:'Diseño claro, navegación sencilla y detalles que se sienten.',accion:'Probar interacción ↗',estado:'HTML · CSS · JavaScript',codigo:'const idea = "tu proyecto";',feedback:'La interfaz responde al toque y guía a cada visitante.'},
  app:{titulo:'Todo en tu bolsillo.',texto:'Una experiencia móvil que pone las funciones importantes al alcance.',accion:'Simular pantalla ↗',estado:'UX/UI · APP · PROTOTIPO',codigo:'const pantalla = "móvil";',feedback:'Vista móvil activada: contenido organizado para pantallas pequeñas.'},
  datos:{titulo:'Datos que cuentan historias.',texto:'Información ordenada para encontrar patrones y tomar mejores decisiones.',accion:'Mostrar resultado ↗',estado:'DATOS · LÓGICA · VISUALIZACIÓN',codigo:'const datos = analizar(info);',feedback:'Resultado de ejemplo: 3 ideas organizadas y listas para explorar.'}
 };
 const titulo=document.querySelector('#rrLabPreviewTitulo'),texto=document.querySelector('#rrLabPreviewTexto'),accion=document.querySelector('#rrLabAccion'),feedback=document.querySelector('#rrLabFeedback'),estado=document.querySelector('#rrLabEstado'),codigo=escenario.querySelector('.rrLabCodigo');
 let actual='web',toques=0;
 document.querySelectorAll('[data-lab]').forEach(btn=>btn.addEventListener('click',()=>{
  actual=btn.dataset.lab;toques=0;const d=datos[actual];
  document.querySelectorAll('[data-lab]').forEach(b=>{const activo=b===btn;b.classList.toggle('activo',activo);b.setAttribute('aria-pressed',String(activo));});
  titulo.textContent=d.titulo;texto.textContent=d.texto;accion.textContent=d.accion;estado.textContent=d.estado;feedback.textContent=d.feedback;
  codigo.innerHTML='<span class="rrCodeMuted">const</span> '+d.codigo.replace(/^const /,'').replace(/;$/,';');
  escenario.classList.remove('cambio');void escenario.offsetWidth;escenario.classList.add('cambio');
 }));
 accion.addEventListener('click',()=>{toques++;const mensajes={web:'¡Bien! La web podría abrir una sección, enviar un formulario o mostrar un proyecto.',app:'¡Demo móvil! La navegación cambia para priorizar las acciones táctiles.',datos:'¡Resultado de muestra! 3 categorías, 8 elementos y una vista más fácil de leer.'};feedback.textContent=mensajes[actual]+' (prueba '+toques+')';escenario.classList.remove('cambio');void escenario.offsetWidth;escenario.classList.add('cambio');});
})();


// Vida extra para todas las páginas internas: títulos, tarjetas y elementos de contenido.
(function(){
  const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards=document.querySelectorAll('body:not(.portadaNueva) .miniServicio,body:not(.portadaNueva) .beneficioGrande,body:not(.portadaNueva) .casoFicha,body:not(.portadaNueva) .casoBloque,body:not(.portadaNueva) .casoPaso,body:not(.portadaNueva) .iaPuntoPanel,body:not(.portadaNueva) .iaNota,body:not(.portadaNueva) .guiaIA,body:not(.portadaNueva) .nosotrosValores>*,body:not(.portadaNueva) .misionVision>*,body:not(.portadaNueva) .contactoGrid>*,body:not(.portadaNueva) .bloque .tarjetas>*');
  cards.forEach((el,i)=>{
    el.classList.add('rr-glow-card');
    if(!reduced&&el.animate){el.animate([{opacity:.72,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,delay:Math.min(i%5,4)*65,easing:'cubic-bezier(.2,.75,.25,1)',fill:'both'});}
    el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.setProperty('--rr-x',(e.clientX-r.left)+'px');el.style.setProperty('--rr-y',(e.clientY-r.top)+'px')},{passive:true});
  });
  // Pequeño pulso visual para títulos de sección al entrar en pantalla.
  if(!reduced&&'IntersectionObserver' in window){
    const headings=document.querySelectorAll('body:not(.portadaNueva) main h2,body:not(.portadaNueva) .cabeceraSeccion h2');
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('rr-heading-seen');io.unobserve(entry.target)}}),{threshold:.35});
    headings.forEach(h=>io.observe(h));
  }
})();

// Selector de tema persistente, sincronizado y con halo compacto.
(function(){
  const raiz=document.documentElement;
  // Evita crear dos controles si el script se incluye accidentalmente más de una vez.
  let boton=document.querySelector('.rr-theme-toggle');
  let sombra=document.querySelector('.rr-cursor-shadow');
  if(!sombra){sombra=document.createElement('div');sombra.className='rr-cursor-shadow';sombra.setAttribute('aria-hidden','true');document.body.appendChild(sombra);}
  if(!boton){boton=document.createElement('button');boton.type='button';boton.className='rr-theme-toggle';boton.setAttribute('aria-label','Cambiar al modo oscuro');document.body.appendChild(boton);}

  function temaGuardado(){
    try{return localStorage.getItem('rrStudioTema')==='dark'?'dark':'light';}
    catch(_){return raiz.dataset.theme==='dark'?'dark':'light';}
  }
  function actualizarTema(nuevo,guardar=true){
    const tema=nuevo==='dark'?'dark':'light';
    raiz.dataset.theme=tema;
    const oscuro=tema==='dark';
    // El texto indica el modo al que se cambiará, no el modo activo.
    boton.innerHTML=oscuro
      ? '<span class="rr-theme-icon" aria-hidden="true">☀</span><span class="rr-theme-label">Modo claro</span>'
      : '<span class="rr-theme-icon" aria-hidden="true">☾</span><span class="rr-theme-label">Modo oscuro</span>';
    boton.setAttribute('aria-label',oscuro?'Cambiar al modo claro':'Cambiar al modo oscuro');
    boton.setAttribute('aria-pressed',String(oscuro));
    boton.dataset.activeTheme=tema;
    if(guardar){try{localStorage.setItem('rrStudioTema',tema);}catch(_){}}
  }
  actualizarTema(temaGuardado(),false);
  boton.addEventListener('click',()=>{
    // Leer el valor real del documento evita que el texto y el tema se desincronicen.
    actualizarTema(raiz.dataset.theme==='dark'?'light':'dark',true);
  });
  window.addEventListener('storage',e=>{if(e.key==='rrStudioTema')actualizarTema(e.newValue==='dark'?'dark':'light',false);});

  let programado=false,px=window.innerWidth/2,py=window.innerHeight/2;
  window.addEventListener('pointermove',e=>{
    px=e.clientX;py=e.clientY;if(programado)return;programado=true;
    requestAnimationFrame(()=>{raiz.style.setProperty('--rr-cursor-x',px+'px');raiz.style.setProperty('--rr-cursor-y',py+'px');programado=false;});
  },{passive:true});

  // Objetos geométricos flotantes: decoran todas las páginas sin tapar controles.
  if(!document.querySelector('.rr-orbitas')){
    const deco=document.createElement('div');deco.className='rr-orbitas';deco.setAttribute('aria-hidden','true');
    deco.innerHTML='<span class="rr-orbita rr-orbita-a">✳</span><span class="rr-orbita rr-orbita-b">◇</span><span class="rr-orbita rr-orbita-c">+</span><span class="rr-orbita rr-orbita-d">◌</span><span class="rr-orbita rr-orbita-e">✦</span>';
    document.body.appendChild(deco);
  }

  // Efectos de luz que siguen el puntero dentro de cada bloque interactivo.
  document.querySelectorAll('.rr-glow-card,.miniServicio,.beneficioGrande,.casoFicha,.casoBloque,.casoPaso,.iaPuntoPanel,.tarjeta,.tarjetaServicio,.proyectoCard,.clienteCard,.servicioCard,.rr-feature-card').forEach(el=>{
    el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.setProperty('--rr-x',(e.clientX-r.left)+'px');el.style.setProperty('--rr-y',(e.clientY-r.top)+'px');},{passive:true});
  });

  // Laboratorio de HTML de la página Servicios.
  const editor=document.getElementById('rrHtmlEditor'),vista=document.getElementById('rrHtmlPreview');
  const ejecutar=document.getElementById('rrHtmlRun'),reiniciar=document.getElementById('rrHtmlReset'),copiar=document.getElementById('rrHtmlCopy');
  const ejemplo = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mi página de práctica</title>
  <style>
    body{font-family:Arial,sans-serif;padding:22px;color:#18365a;background:#f3f7ff}
    h1{color:#397bc1}button{background:#397bc1;color:white;border:0;border-radius:8px;padding:10px 14px;cursor:pointer}
    .demo{background:white;padding:16px;border-radius:14px;margin-top:14px}
    label{display:block;margin:8px 0}select,input{padding:7px;border:1px solid #b8cce4;border-radius:6px}
  </style>
</head>
<body>
  <h1>¡Hola, mundo!</h1>
  <p>Estoy practicando HTML en RR Studio.</p>
  <button onclick="alert('¡Tu botón funciona!')">Probar botón</button>
  <div class="demo">
    <h2>Mi lista</h2>
    <ul><li>Diseñar</li><li>Programar</li><li>Probar</li></ul>
    <h2>Elige una opción</h2>
    <label>Lenguaje favorito: <select><option>HTML</option><option>CSS</option><option>JavaScript</option></select></label>
    <label><input type="checkbox"> Ya practiqué hoy</label>
    <label><input type="radio" name="nivel" checked> Principiante</label>
    <label><input type="radio" name="nivel"> Intermedio</label>
    <label>Tu nombre: <input placeholder="Escribe aquí"></label>
  </div>
</body>
</html>`;
  if(editor&&vista){
    if(!editor.value.trim()) editor.value=ejemplo;
    const correr=()=>{vista.srcdoc=editor.value;};
    ejecutar?.addEventListener('click',correr);
    reiniciar?.addEventListener('click',()=>{editor.value=ejemplo;correr();});
    copiar?.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(editor.value);copiar.textContent='¡Código copiado!';setTimeout(()=>copiar.textContent='Copiar código',1500);}
      catch(_){editor.focus();editor.select();copiar.textContent='Selecciona y copia';}
    });
    correr();
    // Botones de ayuda: insertan ejemplos HTML en la posición del cursor.
    const fragmentos={
      button:'\n<button type="button" onclick="alert(\'¡Hola!\')">Haz clic aquí</button>\n',
      list:'\n<h2>Mi lista</h2>\n<ul>\n  <li>Primer elemento</li>\n  <li>Segundo elemento</li>\n  <li>Tercer elemento</li>\n</ul>\n',
      select:'\n<label for="opciones">Elige una opción:</label>\n<select id="opciones">\n  <option>HTML</option>\n  <option>CSS</option>\n  <option>JavaScript</option>\n</select>\n',
      form:'\n<form onsubmit="event.preventDefault();alert(\'Formulario enviado\')">\n  <label>Tu nombre: <input name="nombre" placeholder="Escribe tu nombre" required></label>\n  <button type="submit">Enviar</button>\n</form>\n',
      table:'\n<table border="1" cellpadding="8">\n  <tr><th>Nombre</th><th>Lenguaje</th></tr>\n  <tr><td>Ana</td><td>HTML</td></tr>\n  <tr><td>Luis</td><td>CSS</td></tr>\n</table>\n',
      image:'\n<img src="https://placehold.co/320x140/c4dafa/18365a?text=Mi+imagen" alt="Imagen de ejemplo" style="max-width:100%;border-radius:12px">\n'
    };
    document.querySelectorAll('[data-html-snippet]').forEach(b=>b.addEventListener('click',()=>{
      const snippet=fragmentos[b.dataset.htmlSnippet];if(!snippet)return;
      const ini=editor.selectionStart,fin=editor.selectionEnd;
      editor.setRangeText(snippet,ini,fin,'end');editor.focus();
      b.textContent='¡Añadido!';setTimeout(()=>{b.textContent=({button:'Botón',list:'Lista',select:'Selección',form:'Formulario',table:'Tabla',image:'Imagen'})[b.dataset.htmlSnippet]},1000);
    }));
  }
})();


// Laboratorio CSS de la página Proyectos: solo modifica el documento de vista previa.
(function(){
  const editor=document.getElementById('rrCssEditor');
  const vista=document.getElementById('rrCssPreview');
  const ejecutar=document.getElementById('rrCssRun');
  const reiniciar=document.getElementById('rrCssReset');
  const copiar=document.getElementById('rrCssCopy');
  if(!editor||!vista)return;
  const ejemplo=editor.value;
  const paginaBase = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{margin:0;padding:24px;background:#f0f6ff;color:#18365a;font-family:Arial,sans-serif;font-size:15px}
.tarjeta-demo{background:#fff;max-width:520px;border-radius:18px;padding:22px;border:2px solid #c4dafa;box-shadow:0 10px 24px #397bc133}
h1{color:#397bc1;font-size:30px}h2{font-size:20px}p{line-height:1.6}.etiqueta-demo{display:inline-block;padding:5px 9px;border-radius:999px;background:#e4efff;color:#397bc1;font-size:12px;font-weight:bold}
button{background:#397bc1;color:#fff;font-size:15px;border:0;border-radius:10px;padding:11px 16px;cursor:pointer}li{margin:6px 0}select{padding:8px;border:1px solid #9bbde4;border-radius:8px;background:#fff;color:#18365a}
</style></head><body><main class="tarjeta-demo"><span class="etiqueta-demo">RR STUDIO · DEMO</span><h1>¡Dale estilo a tu página!</h1><p>Esta mini página cambia cuando editas el CSS. Prueba colores, tamaños, bordes y sombras para ver cómo afectan la experiencia.</p><button onclick="this.textContent=this.textContent==='¡Funciona!'?'Probar botón':'¡Funciona!'">Probar botón</button><h2>Lo que podemos crear</h2><ul><li>Diseños modernos</li><li>Botones interactivos</li><li>Tarjetas con estilo</li></ul><label for="temaDemo">Elige un tema: </label><select id="temaDemo" onchange="document.querySelector('.tarjeta-demo').style.borderColor=this.value"><option value="#c4dafa">Azul suave</option><option value="#9de8d5">Verde menta</option><option value="#d8b4fe">Violeta</option></select><p><small>Tip: cambia las propiedades CSS del editor y vuelve a pulsar Aplicar CSS.</small></p></main></body></html>`;
  function aplicar(){const html=paginaBase.replace('</head>','<style>'+editor.value.replace(/<\/style/gi,'<\\/style')+'</style></head>');vista.srcdoc=html;}
  ejecutar?.addEventListener('click',aplicar);
  reiniciar?.addEventListener('click',()=>{editor.value=ejemplo;aplicar();});
  copiar?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(editor.value);copiar.textContent='¡CSS copiado!';setTimeout(()=>copiar.textContent='▣ Copiar CSS',1500);}catch(_){editor.focus();editor.select();copiar.textContent='Selecciona y copia';}});
  aplicar();
})();

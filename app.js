"use strict";
/* ===== Utilidades ===== */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const el = (tag, cls, html = '') => Object.assign(document.createElement(tag), {className: cls, innerHTML: html});
const eur = c => (c / 100).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
const pulsado = (sel, v) => $(sel).setAttribute('aria-pressed', v);
const marcar = (grupo, clave, valor) => $$(grupo + ' button').forEach(b => b.setAttribute('aria-pressed', b.dataset[clave] === valor));
// Todo el dinero va en céntimos (evita errores de decimales). 250 -> "2 euros con 50 céntimos"
const voz = c => {
  const e = Math.floor(c / 100), m = c % 100, p = [];
  if (e || !m) p.push(e + (e === 1 ? ' euro' : ' euros'));
  if (m) p.push(m + (m === 1 ? ' céntimo' : ' céntimos'));
  return p.join(' con ');
};
const LS = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

/* ===== Voz (lee en voz alta) ===== */
const VOZ_M = /jorge|diego|pablo|juan|enrique|alvaro|álvaro|carlos|raul|raúl|miguel|antonio|david|pedro|jose|josé|male|hombre/i;
const VOZ_F = /monica|mónica|paulina|helena|laura|lucia|lucía|elvira|sabina|marisol|maria|maría|esperanza|carmen|paloma|female|mujer|google español/i;
function elegirVoz(g) {
  const [si, no] = g === 'm' ? [VOZ_M, VOZ_F] : [VOZ_F, VOZ_M];
  return speechSynthesis.getVoices().find(v => /^es/i.test(v.lang) && si.test(v.name) && !no.test(v.name));
}
function hablar(texto, forzar) {
  if ((!aj.voz && !forzar) || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto), v = elegirVoz(aj.genero);
  u.lang = 'es-ES'; u.rate = .94;
  if (v) { u.voice = v; u.lang = v.lang; } else u.pitch = aj.genero === 'm' ? .6 : 1.15; // sin voz del sistema: se cambia el tono
  speechSynthesis.speak(u);
}
window.speechSynthesis?.getVoices(); // algunos navegadores cargan las voces al pedirlas

/* ===== Ajustes (se guardan en el dispositivo) ===== */
const aj = {voz: false, contraste: false, tamano: 'normal', genero: 'f', ...LS.get('cdcp_aj2', {})};
function pintaAj() {
  document.documentElement.dataset.t = aj.tamano;
  document.documentElement.dataset.c = aj.contraste ? 'on' : 'off';
  pulsado('#vCon', aj.voz); pulsado('#vSin', !aj.voz);
  $('#sV').setAttribute('aria-checked', aj.voz);
  $('#sC').setAttribute('aria-checked', aj.contraste);
  marcar('#sT', 'v', aj.tamano); marcar('#sG', 'g', aj.genero);
  LS.set('cdcp_aj2', aj);
}
function cambiaAj(cambio, frase) { Object.assign(aj, cambio); pintaAj(); if (frase) hablar(frase); }
$('#vCon').onclick = () => cambiaAj({voz: true}, 'Con voz. Te iré diciendo lo que haces.');
$('#vSin').onclick = () => { cambiaAj({voz: false}); window.speechSynthesis?.cancel(); $('#anu').textContent = 'Sin voz'; };
$('#sV').onclick = () => cambiaAj({voz: !aj.voz}, !aj.voz && 'Voz activada'); // dice «Voz activada» solo al encenderla
$('#sC').onclick = () => cambiaAj({contraste: !aj.contraste});
$$('#sG button').forEach(b => b.onclick = () => cambiaAj({genero: b.dataset.g}, b.dataset.g === 'm' ? 'Hola, soy la voz masculina' : 'Hola, soy la voz femenina'));
$$('#sT button').forEach(b => b.onclick = () => cambiaAj({tamano: b.dataset.v}));

/* ===== Navegación entre pantallas ===== */
function ir(id) {
  if (id === 'p-com') pintaTot();
  if (id === 'p-fam') pintaEd();
  $$('.pan').forEach(p => p.classList.toggle('on', p.id === id));
  const h = $(`#${id} h2`); h.tabIndex = -1; h.focus({preventScroll: true}); // el lector de pantalla anuncia el título
  scrollTo(0, 0);
}
$$('[data-ir]').forEach(b => b.onclick = () => ir(b.dataset.ir));
$('#bAj').onclick = () => ir('p-aj');
$('#bIni').onclick = () => { ir('p-ini'); hablar('Inicio'); };
$('#hCalc').onclick = () => { ir('p-con'); hablar('Calculadora completa. Toca el dinero que llevas.'); };

/* ===== Paso 1: mi dinero ===== */
const num = v => v >= 100 ? v / 100 : v;               // 500 -> 5 | 50 -> 50
const txt = v => v >= 100 ? v / 100 + ' €' : v + ' c';  // 500 -> "5 €" | 50 -> "50 c"
// Cada pieza usa su imagen de utils/ (billete5.webp, moneda50.webp...). Si falta, se ve el dibujo.
const PIEZAS = [10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10].map(v => {
  const bill = v >= 500;
  return {v, bill, cls: (bill ? 'b' : 'c') + num(v), img: `utils/${bill ? 'billete' : 'moneda'}${num(v)}.webp`};
});
let tocadas = [], modo = 'uno';
const suma = () => tocadas.reduce((a, x) => a + x, 0);

PIEZAS.forEach(p => {
  const b = el('button', `pz ${p.bill ? 'bill' : 'coin'} ${p.cls}`, p.bill ? `<span class="be">EURO</span><span class="bv">${txt(p.v)}</span>` : txt(p.v));
  const img = new Image();
  img.alt = ''; img.src = p.img;
  img.onload = () => { if (p.bill) b.style.aspectRatio = img.naturalWidth + '/' + img.naturalHeight; b.classList.add('im'); };
  img.onerror = () => img.remove();
  p.n = el('span', 'n');
  b.prepend(img); b.append(p.n);
  b.setAttribute('aria-label', 'Añadir ' + voz(p.v));
  b.onclick = () => {
    if (modo === 'cant') { $('#dT').textContent = `¿Cuántos tienes de ${txt(p.v)}?`; $('#dG').dataset.v = p.v; $('#dlg').showModal(); return; }
    tocadas.push(p.v); pintaDin();
    hablar(`${voz(p.v)}. Ahora tienes ${voz(suma())}`);
  };
  $(p.bill ? '#gB' : '#gM').append(b);
});
function pintaDin() {
  $('#tDin').textContent = eur(suma());
  PIEZAS.forEach(p => { const k = tocadas.filter(x => x === p.v).length; p.n.textContent = k; p.n.classList.toggle('on', k > 0); });
}
$('#bUndo').onclick = () => { tocadas.pop(); pintaDin(); hablar('Quitado. Tienes ' + voz(suma())); };
$('#bVac').onclick = () => { tocadas = []; pintaDin(); hablar('Todo borrado. Tienes 0 euros.'); };
$$('#sM button').forEach(b => b.onclick = () => { modo = b.dataset.m; marcar('#sM', 'm', modo); });
// Ventana "Elegir cuántos": botones del 0 al 9
for (let i = 0; i <= 9; i++) {
  const k = el('button', 'btn', i);
  k.onclick = () => {
    const v = +$('#dG').dataset.v;
    tocadas = tocadas.filter(x => x !== v).concat(Array(i).fill(v));
    pintaDin(); $('#dlg').close();
    hablar(`${i} de ${voz(v)}. Ahora tienes ${voz(suma())}`);
  };
  $('#dG').append(k);
}
$('#dC').onclick = () => $('#dlg').close();

/* ===== Paso 2: mi compra (productos de farmacia) ===== */
const CATEGORIAS = {medicina: ['pill', 'Medicina'], cura: ['cross', 'Primeros auxilios'], higiene: ['drop', 'Higiene'], otro: ['tag', 'Otro']};
let prods = LS.get('cdcp_prod3', [
  {id: 'p1', cat: 'medicina', nombre: 'Paracetamol', precio: 3.2}, {id: 'p2', cat: 'medicina', nombre: 'Ibuprofeno', precio: 4.75},
  {id: 'p3', cat: 'cura', nombre: 'Tiritas', precio: 2.5}, {id: 'p4', cat: 'cura', nombre: 'Gasas estériles', precio: 2.1},
  {id: 'p5', cat: 'higiene', nombre: 'Suero fisiológico', precio: 4.1}, {id: 'p6', cat: 'medicina', nombre: 'Jarabe para la tos', precio: 5.8}]);
let cant = {}, libre = 0;   // cant: cuántos de cada producto | libre: "otra cantidad" en céntimos
const guarda = () => LS.set('cdcp_prod3', prods);
const cents = p => Math.round((p.precio || 0) * 100);
const compra = () => libre + prods.reduce((a, p) => a + (cant[p.id] || 0) * cents(p), 0);
const pintaTot = () => { $('#tCom').textContent = eur(compra()); $('#tTiene').textContent = eur(suma()); };
// Icono del producto: foto propia > pictograma ARASAAC > icono de su categoría
function ico(p) {
  if (p.foto) return `<img alt="" src="${p.foto}">`;
  const id = String(p.pic || '').replace(/\D/g, '');
  return `<svg class="ic"><use href="#${(CATEGORIAS[p.cat] || CATEGORIAS.otro)[0]}"/></svg>` +
    (id ? `<img alt="" src="https://static.arasaac.org/pictograms/${id}/${id}_300.png" onerror="this.remove()">` : '');
}
function pintaCom() {
  const lista = $('#lP'); lista.innerHTML = '';
  prods.forEach(p => {
    const f = el('div', 'prod', `<div class="pi" aria-hidden="true">${ico(p)}</div><div class="inf"><b></b><span></span></div>
      <div class="st"><button aria-label="Quitar uno">−</button><b>${cant[p.id] || 0}</b><button class="m" aria-label="Añadir uno">+</button></div>`);
    f.querySelector('.inf b').textContent = p.nombre;       // textContent: el nombre lo escribe el usuario
    f.querySelector('.inf span').textContent = eur(cents(p));
    const q = f.querySelector('.st b'), [quitar, anadir] = f.querySelectorAll('.st button');
    const poner = n => { cant[p.id] = n; q.textContent = n; pintaTot(); };
    quitar.onclick = () => { if (cant[p.id] > 0) { poner(cant[p.id] - 1); hablar(`${p.nombre}, ${cant[p.id]}`); } };
    anadir.onclick = () => { poner((cant[p.id] || 0) + 1); hablar(`${cant[p.id]} ${p.nombre}, ${voz(cant[p.id] * cents(p))}`); };
    lista.append(f);
  });
  pintaTot();
}
$('#lib').oninput = e => { libre = Math.round((parseFloat(e.target.value) || 0) * 100); pintaTot(); };

// Foto del precio: lee el texto en el propio dispositivo (Tesseract) y propone los precios que encuentra
$('#bFoto').onclick = () => $('#fFoto').click();
$('#fFoto').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  const opciones = $('#fOpc'), msg = $('#fMsg');
  $('#foto').hidden = false; $('#fImg').src = URL.createObjectURL(f);
  opciones.innerHTML = ''; msg.textContent = 'Leyendo el precio…';
  try {
    if (!window.Tesseract) throw 0;
    const w = await Tesseract.createWorker('eng'), r = await w.recognize(f); await w.terminate();
    const precios = [...new Set((r.data.text.match(/\d{1,3}[.,]\d{2}/g) || []).map(s => Math.round(parseFloat(s.replace(',', '.')) * 100)))].filter(c => c > 0 && c < 100000);
    msg.textContent = precios.length ? '¿Cuál es el precio? Toca el correcto:' : 'No he podido leer el precio. Prueba otra foto o escríbelo.';
    precios.forEach(c => {
      const b = el('button', '', eur(c));
      b.onclick = () => { libre = c; $('#lib').value = (c / 100).toFixed(2); pintaTot(); opciones.innerHTML = ''; msg.textContent = 'Añadido: ' + eur(c); hablar('Añadido ' + voz(c)); };
      opciones.append(b);
    });
  } catch { msg.textContent = 'No he podido leer la foto. Escribe el precio.'; }
  e.target.value = '';
};

/* ===== Paso 3: resultado ===== */
const DEN = [10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
const color = v => v >= 500 ? `var(--b${v / 100})` : v >= 10 ? 'var(--au)' : 'var(--cu)';
function desglose(c) {   // cambio en las piezas más grandes posibles: [[valor, cuántas], ...]
  return DEN.flatMap(d => { const n = Math.floor(c / d); c -= n * d; return n ? [[d, n]] : []; });
}
let ultimoMensaje = '';
function mostrar(cls, icono, titulo, detalle, chips, msg) {
  $('#res').className = 'res ' + cls;
  $('#rIc').innerHTML = `<use href="#${icono}"/>`;
  $('#rT').textContent = titulo; $('#rD').innerHTML = detalle;
  $('#rC').replaceChildren(...chips.map(([v, n]) => el('span', '', `<i style="background:${color(v)}"></i>${n} × ${txt(v)}`)));
  ir('p-res'); $('#anu').textContent = ultimoMensaje = msg;
}
$('#bCom').onclick = () => {
  const co = compra(), te = suma(), dif = te - co;
  $('#rCo').textContent = eur(co); $('#rTi').textContent = eur(te);
  if (!co) mostrar('in', 'info', 'Todavía no has elegido nada', `Tienes <b>${eur(te)}</b>Cuando quieras, elige qué comprar.`, [], `Todavía no has elegido nada. Tienes ${voz(te)}.`);
  else if (dif >= 0) mostrar('ok', 'check', 'Sí te alcanza', dif ? `Te devuelven<b>${eur(dif)}</b>` : 'Es la cantidad justa<b>No te devuelven nada</b>', desglose(dif),
    dif ? `Sí te alcanza. Te devuelven ${voz(dif)}.` : 'Sí te alcanza. Es la cantidad justa.');
  else mostrar('no', 'info', 'Todavía no te alcanza', `Te faltan<b>${eur(-dif)}</b><small>No pasa nada. Puedes quitar algún producto.</small>`, [],
    `Todavía no te alcanza. Te faltan ${voz(-dif)}. No pasa nada. Puedes quitar algún producto.`);
};
$('#bEsc').onclick = () => ultimoMensaje && hablar(ultimoMensaje, true);
$('#bNew').onclick = () => { tocadas = []; cant = {}; libre = 0; $('#lib').value = ''; pintaDin(); pintaCom(); ir('p-ini'); hablar('Todo borrado.'); };

/* ===== Zona familiar: editar productos ===== */
function pintaEd() {
  const lista = $('#lE'); lista.innerHTML = '';
  prods.forEach((p, i) => {
    const opciones = Object.entries(CATEGORIAS).map(([k, [, nombre]]) => `<option value="${k}">${nombre}</option>`).join('');
    const f = el('div', 'ed', `
      <div class="r1"><span class="pi" aria-hidden="true"></span><select aria-label="Tipo">${opciones}</select><button class="q" aria-label="Eliminar">✕</button></div>
      <input type="text" aria-label="Nombre">
      <input type="number" step="0.01" min="0" aria-label="Precio en euros">
      <input type="text" inputmode="numeric" aria-label="Número de pictograma ARASAAC (opcional)" placeholder="Pictograma ARASAAC (número, opcional)">
      <div class="fotob"><button type="button" class="btn bf"><svg class="ic"><use href="#cam"/></svg><span></span></button><button type="button" class="btn bq" hidden>Quitar foto</button><input type="file" accept="image/*" aria-label="Elegir foto del producto"></div>`);
    const pi = f.querySelector('.pi'), tipo = f.querySelector('select'), [nombre, precio, pic, archivo] = f.querySelectorAll('input');
    const bFoto = f.querySelector('.bf'), bQuitar = f.querySelector('.bq');
    const guardar = () => { guarda(); pintaCom(); pi.innerHTML = ico(p); };
    const estadoFoto = () => { bFoto.querySelector('span').textContent = p.foto ? 'Cambiar foto' : 'Añadir foto del medicamento'; bQuitar.hidden = !p.foto; };
    pi.innerHTML = ico(p); tipo.value = p.cat || 'otro'; nombre.value = p.nombre; precio.value = p.precio; pic.value = p.pic || ''; estadoFoto();
    tipo.onchange = () => { p.cat = tipo.value; guardar(); };
    nombre.oninput = () => { p.nombre = nombre.value; guardar(); };
    precio.oninput = () => { p.precio = parseFloat(precio.value) || 0; guardar(); };
    pic.oninput = () => { p.pic = pic.value.replace(/\D/g, ''); guardar(); };
    bFoto.onclick = () => archivo.click();
    archivo.onchange = () => {   // la foto se reduce a 200 px para que ocupe poco al guardarla
      const fl = archivo.files[0]; if (!fl) return;
      const lector = new FileReader();
      lector.onload = () => {
        const im = new Image();
        im.onload = () => {
          const k = Math.min(1, 200 / Math.max(im.width, im.height)), c = el('canvas');
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          p.foto = c.toDataURL('image/jpeg', .8); guardar(); estadoFoto();
        };
        im.src = lector.result;
      };
      lector.readAsDataURL(fl); archivo.value = '';
    };
    bQuitar.onclick = () => { delete p.foto; guardar(); estadoFoto(); };
    f.querySelector('.q').onclick = () => { prods.splice(i, 1); guarda(); pintaEd(); pintaCom(); };
    lista.append(f);
  });
}
$('#bAdd').onclick = () => { prods.push({id: 'p' + Date.now(), cat: 'otro', nombre: 'Producto nuevo', precio: 1}); guarda(); pintaEd(); pintaCom(); };

/* ===== Botón SOS ===== */
const sos = LS.get('cdcp_sos', {nombre: '', tel: ''});
[['#sNom', 'nombre'], ['#sTel', 'tel']].forEach(([id, k]) => {
  $(id).value = sos[k] || '';
  $(id).oninput = () => { sos[k] = $(id).value; LS.set('cdcp_sos', sos); };
});
$('#bSos').onclick = () => {
  const tel = (sos.tel || '').replace(/[^\d+]/g, ''), quien = sos.nombre || 'tu familiar', hay = !!tel;
  const frase = hay ? `¿Llamar a ${quien}?` : 'Todavía no hay un número';
  $('#sosT').textContent = frase;
  $('#sosP').textContent = hay ? sos.tel : 'Un familiar puede añadirlo en Zona familiar.';
  $('#sosLl').hidden = !hay; $('#sosFam').hidden = hay;
  if (hay) $('#sosLl').href = 'tel:' + tel;
  hablar(hay ? `¿Quieres llamar a ${quien}?` : frase + '. Un familiar puede añadirlo en Zona familiar.');
  $('#dSos').showModal();
};
$('#sosC').onclick = () => $('#dSos').close();
$('#sosLl').onclick = () => setTimeout(() => $('#dSos').close(), 300);
$('#sosFam').onclick = () => { $('#dSos').close(); ir('p-fam'); };

/* ===== Arranque ===== */
pintaAj(); pintaDin(); pintaCom();

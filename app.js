let profile = null;
let users = JSON.parse(localStorage.getItem("nexus_users") || "[]");
let mockCitas = JSON.parse(localStorage.getItem("nexus_citas") || "[]");
let mockEspacios = JSON.parse(localStorage.getItem("nexus_espacios") || "[]");
let notifications = JSON.parse(localStorage.getItem("nexus_notifs") || "[]");

const SERVICE_ID = "service_fkrw0as"; 
const TEMPLATE_ID = "template_7pxr7fh"; 

document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) window.lucide.createIcons();
    document.getElementById("login-form").onsubmit = handleLoginSubmit;
    document.getElementById("register-form").onsubmit = handleRegisterSubmit;
    document.getElementById("apt-form").onsubmit = handleAptSubmit;

    const saved = localStorage.getItem("nexus_profile");
    setTimeout(() => {
        if (saved) { profile = JSON.parse(saved); startApp(); } 
        else { showView("login"); }
    }, 1200);
});

function startApp() {
    showView("main");
    document.getElementById("user-name").innerText = profile.name.split(" ")[0];
    document.getElementById("role-label").innerText = profile.role === "admin" ? "ADMINISTRADOR (COORDINACIÓN)" : "ESTUDIANTE ACTIVO";
    syncData();
    updateNotifUI();
    tab('home');
}

function syncData() {
    localStorage.setItem("nexus_citas", JSON.stringify(mockCitas));
    localStorage.setItem("nexus_espacios", JSON.stringify(mockEspacios));
    renderList("list-citas", mockCitas, "citas");
    renderList("list-espacios", mockEspacios, "espacios");
    const all = [...mockCitas, ...mockEspacios];
    document.getElementById("stat-pending").innerText = all.filter(i => i.status === "pending").length;
    document.getElementById("stat-approved").innerText = all.filter(i => i.status === "approved").length;
    document.getElementById("stat-total").innerText = all.length;
}

function renderList(cid, items, cat) {
    const list = document.getElementById(cid);
    let filtered = profile.role === "admin" ? items : items.filter(i => i.userId === profile.id);

    list.innerHTML = filtered.map(i => {
        let btn = "";
        if (i.status === "approved") {
            btn += `<button onclick="downloadPass('${cat}','${i.id}')" class="p-2 text-red-500 bg-red-500/10 rounded-xl hover:bg-red-600 hover:text-white transition-all"><i data-lucide="file-text" class="w-4 h-4"></i></button>`;
        }
        if (profile.role === "admin" && i.status === "pending") {
            btn += `<button onclick="updateStatus('${cat}','${i.id}','approved')" class="p-2 text-green-500 bg-green-500/10 rounded-xl hover:bg-green-500 hover:text-white transition-all"><i data-lucide="check" class="w-4 h-4"></i></button>`;
        }
        btn += `<button onclick="deleteItem('${cat}','${i.id}')" class="p-2 text-slate-500 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;

        return `
            <div class="glass p-5 rounded-2xl flex justify-between items-center animate-view border-white/5">
                <div>
                    <p class="text-[10px] font-black uppercase text-white">${i.type || i.space}</p>
                    <p class="text-[8px] text-slate-500 uppercase mt-1 font-bold">${i.userName} • ${i.date}</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-[8px] font-black uppercase ${i.status === 'approved' ? 'text-green-500' : 'text-yellow-500'} tracking-widest">${i.status}</span>
                    <div class="flex gap-1">${btn}</div>
                </div>
            </div>
        `;
    }).join("");
    if (window.lucide) window.lucide.createIcons();
}

// EMAILJS
function sendGmail(user, item) {
    const folio = item.id.split('_')[1].substring(0, 6).toUpperCase();
    const params = {
        nombre: user.name,
        email_to: user.email,
        asunto: item.type || item.space,
        fecha: item.date,
        ticket_id: folio,
        status_confirm: "APROBADO"
    };

    emailjs.send(SERVICE_ID, TEMPLATE_ID, params)
        .then(() => showToast("Gmail enviado a " + user.email))
        .catch(err => console.error("EmailJS Fail:", err));
}

// STATUS
window.updateStatus = (cat, id, status) => {
    const list = cat === "citas" ? mockCitas : mockEspacios;
    const item = list.find(x => x.id === id);
    if (item) {
        item.status = status;
        const student = users.find(u => u.id === item.userId);
        addNotif(item.userId, "TRÁMITE APROBADO", `Tu solicitud de ${item.type || item.space} ha sido autorizada.`);
        if (status === "approved" && student) sendGmail(student, item);
        syncData();
    }
}

// PDF
window.downloadPass = (cat, id) => {
    const item = (cat === "citas" ? mockCitas : mockEspacios).find(x => x.id === id);
    const folio = item.id.split('_')[1].substring(0, 6).toUpperCase();
    
    document.getElementById("pdf-name").innerText = item.userName;
    document.getElementById("pdf-type").innerText = (item.type || item.space).toUpperCase();
    document.getElementById("pdf-date").innerText = item.date;
    document.getElementById("pdf-folio").innerText = folio;
    
    const element = document.getElementById('nexus-ticket');
    html2pdf().from(element).set({
        margin: 10, filename: `Nexus_Pass_${folio}.pdf`, 
        html2canvas: { scale: 2, backgroundColor: '#020617' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save();

    showToast("PDF generado exitosamente");
}

// AI ASSISTANT
window.toggleAI = () => document.getElementById("ai-window").classList.toggle("hidden");

window.askAI = () => {
    const input = document.getElementById("ai-input");
    const content = document.getElementById("ai-content");
    const val = input.value.toLowerCase();
    if(!val) return;

    let resp = "Para ese proyecto, te sugiero el **Taller Pesado**. Es el lugar ideal para prototipado físico.";
    if(val.includes("circuito") || val.includes("arduino") || val.includes("sensor")) resp = "Te conviene el **Laboratorio A**, cuenta con estaciones de soldadura y equipo de medición.";
    if(val.includes("3d") || val.includes("imprimir") || val.includes("diseño")) resp = "Debes reservar el área de **Impresión 3D**. No olvides traer tu archivo en formato .STL.";

    content.innerHTML += `<p class="text-white text-right italic font-bold">"${val}"</p><p class="bg-red-600/10 p-3 rounded-2xl border border-red-600/20 text-white">${resp}</p>`;
    input.value = "";
    content.scrollTop = content.scrollHeight;
}

// AUTH
function handleLoginSubmit(e) {
    e.preventDefault();
    const u = users.find(x => x.email === document.getElementById("email").value && x.pass === document.getElementById("password").value);
    if(u) { profile = u; localStorage.setItem("nexus_profile", JSON.stringify(u)); startApp(); }
    else showToast("Usuario o contraseña incorrectos");
}

function handleRegisterSubmit(e) {
    e.preventDefault();
    const nu = { id: "u_"+Date.now(), name: document.getElementById("reg-name").value, email: document.getElementById("reg-email").value, pass: document.getElementById("reg-pass").value, role: document.getElementById("reg-role").value };
    users.push(nu); localStorage.setItem("nexus_users", JSON.stringify(users));
    showToast("Usuario registrado correctamente"); closeRegister();
}

// UTILS
window.tab = (id) => {
    document.querySelectorAll('[id^="view-"]').forEach(v => v.classList.add("hidden"));
    document.getElementById("view-" + id).classList.remove("hidden");
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("uvm-gradient", "text-white", "shadow-xl"));
    document.getElementById("tab-" + id).classList.add("uvm-gradient", "text-white", "shadow-xl");
}

window.logout = () => { localStorage.removeItem("nexus_profile"); location.reload(); }
window.openRegister = () => document.getElementById("register-view").classList.remove("hidden");
window.closeRegister = () => document.getElementById("register-view").classList.add("hidden");

function showView(id) {
    document.getElementById("loader").classList.add("hidden");
    document.getElementById("login-view").classList.toggle("hidden", id !== "login");
    document.getElementById("main-view").classList.toggle("hidden", id !== "main");
}

function showToast(m) {
    const t = document.getElementById("toast");
    document.getElementById("toast-text").innerText = m;
    t.classList.remove("translate-x-[500px]");
    setTimeout(() => t.classList.add("translate-x-[500px]"), 3000);
}

function addNotif(uid, title, msg) {
    notifications.unshift({ id: Date.now(), to: uid, title, msg, read: false });
    localStorage.setItem("nexus_notifs", JSON.stringify(notifications));
    updateNotifUI();
}

function updateNotifUI() {
    const my = notifications.filter(n => n.to === profile?.id);
    document.getElementById("notif-badge").classList.toggle("hidden", my.filter(n => !n.read).length === 0);
    document.getElementById("notif-list").innerHTML = my.length ? my.map(n => `
        <div class="p-4 rounded-2xl ${n.read ? 'bg-white/5 opacity-50' : 'bg-red-600/10 border border-red-600/20'} animate-view">
            <p class="text-[9px] font-black text-red-500 uppercase">${n.title}</p>
            <p class="text-[11px] text-white leading-tight mt-1 font-bold">${n.msg}</p>
        </div>
    `).join("") : "<p class='text-center text-[10px] mt-10 text-slate-600 uppercase font-black tracking-tighter'>Bandeja vacía</p>";
}

window.toggleNotifs = () => {
    const p = document.getElementById("notif-panel");
    if (p.classList.contains("translate-x-full")) {
        notifications.forEach(n => { if(n.to === profile.id) n.read = true; });
        localStorage.setItem("nexus_notifs", JSON.stringify(notifications));
        updateNotifUI();
    }
    p.classList.toggle("translate-x-full");
}

let tempSpace = "";
window.openSpaceForm = (s) => { tempSpace = s; document.getElementById("space-selected").innerText = s; document.getElementById("space-form-box").classList.remove("hidden"); }
window.confirmSpaceBooking = () => {
    mockEspacios.push({ id: "e_"+Date.now(), userId: profile.id, userName: profile.name, space: tempSpace, date: document.getElementById("space-date").value, time: document.getElementById("space-time").value, status: "pending" });
    syncData(); document.getElementById("space-form-box").classList.add("hidden"); showToast("Reserva enviada");
}
function handleAptSubmit(e) {
    e.preventDefault();
    mockCitas.push({ id: "c_"+Date.now(), userId: profile.id, userName: profile.name, status: "pending", type: document.getElementById("apt-type").value, date: document.getElementById("apt-date").value, career: document.getElementById("apt-career").value });
    syncData(); showToast("Solicitud registrada");
}
window.deleteItem = (cat, id) => {
    if(cat === "citas") mockCitas = mockCitas.filter(x => x.id !== id);
    else mockEspacios = mockEspacios.filter(x => x.id !== id);
    syncData();
}
window.clearNotifs = () => { notifications = notifications.filter(n => n.to !== profile.id); localStorage.setItem("nexus_notifs", JSON.stringify(notifications)); updateNotifUI(); }
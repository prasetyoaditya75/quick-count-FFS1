// ===== Quick Count - Pemilihan Kepala Desa =====
// Firebase Realtime Database + Dashboard

(function () {
    'use strict';

    // ===== FIREBASE CONFIG =====
    const firebaseConfig = {
        apiKey: "AIzaSyD1Wio4xtXpnaNh__4Yrfog_ITfpd19D1U",
        authDomain: "quickcount-ffs1.firebaseapp.com",
        databaseURL: "https://quickcount-ffs1-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "quickcount-ffs1",
        storageBucket: "quickcount-ffs1.firebasestorage.app",
        messagingSenderId: "454705881295",
        appId: "1:454705881295:web:1a24a9c5f8c5f748a8d7ba",
        measurementId: "G-KNCKTB67Q5"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    const dataRef = db.ref('dataC1');

    // ===== CONFIG =====
    const KANDIDAT = [
        { no: 1, nama: 'Fajar Shodik' },
        { no: 2, nama: 'Duloh' },
        { no: 3, nama: 'Suratno' },
        { no: 4, nama: 'Wirnata' },
        { no: 5, nama: 'Joko' }
    ];

    const CHART_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'];
    const MAX_TPS = 150;
    const MAX_RW = 60;

    // ===== STATE =====
    let dataC1 = [];
    let barChart = null;
    let pieChart = null;
    let currentModule = null;
    let editingTPS = null;

    // ===== DOM ELEMENTS =====
    const el = {
        moduleLauncher: document.getElementById('moduleLauncher'),
        moduleDashboard: document.getElementById('module-dashboard'),
        moduleInput: document.getElementById('module-input'),
        breadcrumb: document.getElementById('breadcrumb'),
        btnHome: document.getElementById('btnHome'),
        totalTPS: document.getElementById('totalTPS'),
        totalSuarahSah: document.getElementById('totalSuarahSah'),
        persenMasuk: document.getElementById('persenMasuk'),
        sisaTPS: document.getElementById('sisaTPS'),
        totalSuaraTidakSah: document.getElementById('totalSuaraTidakSah'),
        tpsBadges: document.getElementById('tpsBadges'),
        lastUpdate: document.getElementById('lastUpdate'),
        hasilTableBody: document.getElementById('hasilTableBody'),
        detailTableBody: document.getElementById('detailTableBody'),
        formC1: document.getElementById('formC1'),
        nomorTPS: document.getElementById('nomorTPS'),
        nomorRW: document.getElementById('nomorRW'),
        suaraTidakSah: document.getElementById('suaraTidakSah'),
        suaraSah: document.getElementById('suaraSah'),
        totalSahTidakSah: document.getElementById('totalSahTidakSah'),
        suratTidakTerpakai: document.getElementById('suratTidakTerpakai'),
        btnResetForm: document.getElementById('btnResetForm'),
        btnResetData: document.getElementById('btnResetData')
    };

    // ===== INIT =====
    function init() {
        populateDropdowns();
        bindEvents();
        navigateToHome();
        listenToFirebase();
    }

    function populateDropdowns() {
        for (let i = 1; i <= MAX_TPS; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = 'TPS ' + i;
            el.nomorTPS.appendChild(opt);
        }
        for (let i = 1; i <= MAX_RW; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = 'RW ' + String(i).padStart(2, '0');
            el.nomorRW.appendChild(opt);
        }
    }

    function updateTPSDropdown() {
        const usedTPS = new Set(dataC1.map(d => d.nomorTPS));
        const options = el.nomorTPS.querySelectorAll('option');
        options.forEach(opt => {
            if (opt.value) {
                const val = parseInt(opt.value);
                if (usedTPS.has(val)) {
                    opt.disabled = true;
                    opt.textContent = `TPS ${val} \u2713 (sudah diinput)`;
                } else {
                    opt.disabled = false;
                    opt.textContent = `TPS ${val}`;
                }
            }
        });
    }

    // ===== FIREBASE REALTIME LISTENER =====
    function listenToFirebase() {
        dataRef.on('value', (snapshot) => {
            const val = snapshot.val();
            dataC1 = val ? Object.values(val) : [];
            dataC1.sort((a, b) => a.nomorTPS - b.nomorTPS || a.rw - b.rw);
            updateDashboard();
            renderDetailTable();
            updateTPSDropdown();
        });
    }

    // ===== EVENTS =====
    function bindEvents() {
        el.btnHome.addEventListener('click', navigateToHome);

        document.querySelectorAll('.module-tile').forEach(tile => {
            tile.addEventListener('click', () => navigateToModule(tile.dataset.module));
        });

        document.querySelectorAll('.sub-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab, tab.dataset.tab));
        });

        el.formC1.addEventListener('submit', handleFormSubmit);
        el.btnResetForm.addEventListener('click', () => {
            el.formC1.reset();
            el.suaraSah.value = 0;
            el.totalSahTidakSah.value = 0;
            showNotification('Form direset', 'success');
        });
        el.btnResetData.addEventListener('click', handleResetData);

        el.suaraTidakSah.addEventListener('input', hitungTotalSuara);
        for (let i = 0; i < 5; i++) {
            const input = document.getElementById(`suaraCalon_${i}`);
            if (input) input.addEventListener('input', hitungSuaraSah);
        }
    }

    function hitungSuaraSah() {
        let totalSah = 0;
        for (let i = 0; i < 5; i++) {
            totalSah += parseInt(document.getElementById(`suaraCalon_${i}`).value) || 0;
        }
        el.suaraSah.value = totalSah;
        hitungTotalSuara();
    }

    function hitungTotalSuara() {
        const tidakSah = parseInt(el.suaraTidakSah.value) || 0;
        const sah = parseInt(el.suaraSah.value) || 0;
        el.totalSahTidakSah.value = tidakSah + sah;
    }

    // ===== NAVIGATION =====
    function navigateToHome() {
        currentModule = null;
        el.moduleLauncher.classList.add('active');
        el.moduleDashboard.classList.remove('active');
        el.moduleInput.classList.remove('active');
        el.breadcrumb.innerHTML = '';
    }

    function navigateToModule(name) {
        currentModule = name;
        el.moduleLauncher.classList.remove('active');
        el.moduleDashboard.classList.remove('active');
        el.moduleInput.classList.remove('active');

        if (name === 'dashboard') { el.moduleDashboard.classList.add('active'); }
        else if (name === 'input') { el.moduleInput.classList.add('active'); }

        const labels = { dashboard: 'Dashboard', input: 'Input Data' };
        const icons = { dashboard: 'fas fa-tachometer-alt', input: 'fas fa-edit' };
        el.breadcrumb.innerHTML = `
            <span class="breadcrumb-item"><span class="breadcrumb-link" id="bcHome"><i class="fas fa-home"></i></span></span>
            <span class="breadcrumb-sep"><i class="fas fa-chevron-right"></i></span>
            <span class="breadcrumb-item"><i class="${icons[name]}"></i> <span class="breadcrumb-current">${labels[name]}</span></span>
        `;
        document.getElementById('bcHome').addEventListener('click', navigateToHome);
    }

    function switchTab(tabEl, tabId) {
        const container = tabEl.closest('.sub-tabs');
        container.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
        tabEl.classList.add('active');
        const view = tabEl.closest('.module-view');
        view.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
    }

    // ===== FORM SUBMIT =====
    function handleFormSubmit(e) {
        e.preventDefault();

        const nomorTPS = parseInt(el.nomorTPS.value);
        const nomorRW = parseInt(el.nomorRW.value);

        if (!nomorTPS || !nomorRW) {
            showNotification('Pilih TPS dan RW terlebih dahulu!', 'error');
            return;
        }

        const suara = [];
        let total = 0;
        for (let i = 0; i < KANDIDAT.length; i++) {
            const val = parseInt(document.getElementById(`suaraCalon_${i}`).value) || 0;
            suara.push(val);
            total += val;
        }

        if (total === 0) {
            showNotification('Masukkan minimal 1 suara!', 'error');
            return;
        }

        const suaraTidakSah = parseInt(el.suaraTidakSah.value) || 0;
        const suaraSah = parseInt(el.suaraSah.value) || 0;
        const suratTidakTerpakai = parseInt(el.suratTidakTerpakai.value) || 0;

        let konfirmasi = `Apakah Anda yakin simpan data ini?\n\n`;
        konfirmasi += `TPS: ${nomorTPS} | RW: ${nomorRW}\n`;
        KANDIDAT.forEach((k, i) => { konfirmasi += `${k.nama}: ${suara[i]}\n`; });
        konfirmasi += `\nSuara Sah: ${suaraSah}`;
        konfirmasi += `\nSuara Tidak Sah: ${suaraTidakSah}`;
        konfirmasi += `\nSurat Tidak Terpakai: ${suratTidakTerpakai}`;

        if (!confirm(konfirmasi)) return;

        // Check duplicate
        const exists = dataC1.find(d => d.nomorTPS === nomorTPS);
        if (exists) {
            showNotification(`TPS ${nomorTPS} sudah diinput!`, 'error');
            return;
        }

        const record = {
            nomorTPS,
            rw: nomorRW,
            suara,
            totalSuara: total,
            suaraTidakSah,
            suaraSah,
            suratTidakTerpakai,
            timestamp: new Date().toISOString()
        };

        // Save to Firebase
        dataRef.child(`tps_${nomorTPS}`).set(record)
            .then(() => {
                showNotification(`Data TPS ${nomorTPS} RW ${nomorRW} berhasil disimpan!`, 'success');
                el.formC1.reset();
                el.suaraSah.value = 0;
                el.totalSahTidakSah.value = 0;
            })
            .catch(err => {
                showNotification('Gagal menyimpan: ' + err.message, 'error');
            });
    }

    function handleResetData() {
        if (!confirm('Apakah Anda yakin ingin menghapus SEMUA data? Tindakan ini tidak dapat dibatalkan.')) return;
        dataRef.remove()
            .then(() => showNotification('Semua data telah direset!', 'warning'))
            .catch(err => showNotification('Gagal reset: ' + err.message, 'error'));
    }

    // ===== RENDER DETAIL TABLE =====
    function renderDetailTable() {
        if (dataC1.length === 0) {
            el.detailTableBody.innerHTML = '<tr><td colspan="12" class="empty-state">Belum ada data TPS masuk</td></tr>';
            return;
        }
        let html = '';
        dataC1.forEach((d, idx) => {
            const isEditing = editingTPS === idx;
            const suaraSah = d.totalSuara;
            const tidakSah = d.suaraTidakSah || 0;
            const sahTidakSah = suaraSah + tidakSah;
            const tidakTerpakai = d.suratTidakTerpakai || 0;

            html += `<tr class="${isEditing ? 'row-editing' : ''}">`;
            html += `<td><strong>TPS ${d.nomorTPS}</strong></td>`;
            html += `<td>RW ${String(d.rw).padStart(2, '0')}</td>`;
            d.suara.forEach((s, i) => {
                if (isEditing) {
                    html += `<td><input type="number" class="edit-input" id="edit_${idx}_${i}" value="${s}" min="0"></td>`;
                } else {
                    html += `<td>${s}</td>`;
                }
            });
            html += `<td><strong>${suaraSah}</strong></td>`;
            html += `<td>${tidakSah}</td>`;
            html += `<td><strong>${sahTidakSah}</strong></td>`;
            html += `<td>${tidakTerpakai}</td>`;
            html += `<td class="aksi-cell">`;
            if (isEditing) {
                html += `<button class="btn btn-success btn-sm" onclick="window.simpanEdit(${idx})"><i class="fas fa-check"></i></button> `;
                html += `<button class="btn btn-secondary btn-sm" onclick="window.batalEdit()"><i class="fas fa-times"></i></button>`;
            } else {
                html += `<button class="btn btn-primary btn-sm" onclick="window.editTPS(${idx})"><i class="fas fa-pencil-alt"></i></button> `;
                html += `<button class="btn btn-danger btn-sm" onclick="window.hapusTPS(${d.nomorTPS})"><i class="fas fa-trash"></i></button>`;
            }
            html += `</td>`;
            html += '</tr>';
        });
        el.detailTableBody.innerHTML = html;
    }

    window.editTPS = function (idx) {
        editingTPS = idx;
        renderDetailTable();
    };

    window.batalEdit = function () {
        editingTPS = null;
        renderDetailTable();
    };

    window.simpanEdit = function (idx) {
        const d = dataC1[idx];
        const newSuara = [];
        let newTotal = 0;
        for (let i = 0; i < KANDIDAT.length; i++) {
            const input = document.getElementById(`edit_${idx}_${i}`);
            const val = parseInt(input.value) || 0;
            newSuara.push(val);
            newTotal += val;
        }

        if (!confirm(`Simpan perubahan data TPS ${d.nomorTPS}?`)) return;

        const updated = { ...d, suara: newSuara, totalSuara: newTotal, timestamp: new Date().toISOString() };
        dataRef.child(`tps_${d.nomorTPS}`).set(updated)
            .then(() => {
                editingTPS = null;
                showNotification(`Data TPS ${d.nomorTPS} diperbarui!`, 'success');
            })
            .catch(err => showNotification('Gagal update: ' + err.message, 'error'));
    };

    window.hapusTPS = function (tps) {
        if (!confirm(`Hapus data TPS ${tps}?`)) return;
        dataRef.child(`tps_${tps}`).remove()
            .then(() => showNotification(`Data TPS ${tps} dihapus`, 'warning'))
            .catch(err => showNotification('Gagal hapus: ' + err.message, 'error'));
    };

    // ===== DASHBOARD =====
    function updateDashboard() {
        const totalTPS = dataC1.length;
        const suaraPerKandidat = new Array(KANDIDAT.length).fill(0);
        dataC1.forEach(d => { d.suara.forEach((s, i) => { suaraPerKandidat[i] += s; }); });
        const grandTotal = suaraPerKandidat.reduce((a, b) => a + b, 0);
        const sisa = MAX_TPS - totalTPS;
        const persen = MAX_TPS > 0 ? ((totalTPS / MAX_TPS) * 100).toFixed(1) : 0;

        el.totalTPS.textContent = `${totalTPS} / ${MAX_TPS}`;
        el.totalSuarahSah.textContent = grandTotal.toLocaleString('id-ID');
        el.persenMasuk.textContent = `${persen}%`;
        el.sisaTPS.textContent = sisa;

        const totalTidakSah = dataC1.reduce((sum, d) => sum + (d.suaraTidakSah || 0), 0);
        el.totalSuaraTidakSah.textContent = totalTidakSah.toLocaleString('id-ID');

        // TPS badges
        if (dataC1.length > 0) {
            el.tpsBadges.innerHTML = dataC1.map(d => `<span class="tps-badge">TPS ${d.nomorTPS}</span>`).join('');
        } else {
            el.tpsBadges.innerHTML = '<p class="empty-state">Belum ada TPS yang diinput</p>';
        }

        if (dataC1.length > 0) {
            const last = dataC1.reduce((l, d) => new Date(d.timestamp) > new Date(l.timestamp) ? d : l);
            const dt = new Date(last.timestamp);
            el.lastUpdate.textContent = `Update: ${dt.toLocaleDateString('id-ID')} ${dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            el.lastUpdate.textContent = 'Belum ada data';
        }

        renderHasilTable(suaraPerKandidat, grandTotal);
        updateCharts(suaraPerKandidat);
    }

    function renderHasilTable(suaraPerKandidat, grandTotal) {
        if (dataC1.length === 0) {
            el.hasilTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada data masuk</td></tr>';
            return;
        }
        const sorted = KANDIDAT.map((k, i) => ({ ...k, suara: suaraPerKandidat[i], idx: i }))
            .sort((a, b) => b.suara - a.suara);

        let html = '';
        sorted.forEach((k, rank) => {
            const persen = grandTotal > 0 ? ((k.suara / grandTotal) * 100).toFixed(2) : 0;
            const trophy = rank === 0 && k.suara > 0 ? ' \u{1F3C6}' : '';
            html += `<tr>
                <td><strong>${k.no}</strong></td>
                <td><strong>${k.nama}</strong>${trophy}</td>
                <td>${k.suara.toLocaleString('id-ID')}</td>
                <td><strong>${persen}%</strong></td>
                <td><div class="progress-bar-container"><div class="progress-bar bar-${k.idx + 1}" style="width:${persen}%"></div></div></td>
            </tr>`;
        });
        el.hasilTableBody.innerHTML = html;
    }

    // ===== CHARTS =====
    function updateCharts(suaraPerKandidat) {
        const labels = KANDIDAT.map(k => k.nama);
        const colors = CHART_COLORS;

        const barCtx = document.getElementById('barChart').getContext('2d');
        if (barChart) barChart.destroy();
        barChart = new Chart(barCtx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Jumlah Suara', data: suaraPerKandidat, backgroundColor: colors.map(c => c + 'CC'), borderColor: colors, borderWidth: 2, borderRadius: 8, borderSkipped: false }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
        });

        const pieCtx = document.getElementById('pieChart').getContext('2d');
        if (pieChart) pieChart.destroy();
        const total = suaraPerKandidat.reduce((a, b) => a + b, 0);
        pieChart = new Chart(pieCtx, {
            type: 'doughnut',
            data: { labels, datasets: [{ data: suaraPerKandidat, backgroundColor: colors.map(c => c + 'CC'), borderColor: '#fff', borderWidth: 3, hoverOffset: 8 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' } }, tooltip: { callbacks: { label: ctx => { const v = ctx.parsed; const p = total > 0 ? ((v / total) * 100).toFixed(1) : 0; return `${ctx.label}: ${v} suara (${p}%)`; } } } }, cutout: '55%' }
        });
    }

    // ===== UTILITY =====
    function showNotification(message, type = 'success') {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.textContent = message;
        document.body.appendChild(notif);
        setTimeout(() => { notif.style.opacity = '0'; notif.style.transform = 'translateX(100px)'; notif.style.transition = 'all 0.3s ease'; setTimeout(() => notif.remove(), 300); }, 3000);
    }

    // ===== START =====
    document.addEventListener('DOMContentLoaded', init);
})();

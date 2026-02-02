const Service = {
    initAuth: async () => {
        try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await auth.signInWithCustomToken(__initial_auth_token); 
            else await auth.signInAnonymously(); 
            
            auth.onAuthStateChanged(user => {
                if(user) {
                    $('#status-text').text('Online').parent().addClass('bg-green-100 text-green-700');
                    Service.setupRealtimeListener('all'); // Default load all
                    Utils.getSettingsRef().onSnapshot(doc => {
                        if(doc.exists) { AppState.masterData = doc.data(); UI.renderDropdowns(); if(AppState.currentView === 'setting') UI.renderSettings(); if(AppState.currentView === 'link_support') UI.renderLinkSupport(); }
                        else { Service.initializeDatabase(false); }
                    }, err => console.error("Settings Error:", err));
                }
            });
        } catch (e) { console.error("Auth Error:", e); Swal.fire('Connection Error', e.message, 'error'); }
    },
    setupRealtimeListener: (year) => {
        if (!year) year = 'all';
        if (AppState.listeners.assignments) { AppState.listeners.assignments(); AppState.listeners.assignments = null; }
        
        let query = Utils.getAssignmentsRef();
        if (year !== 'all') { const startDate = `${year}-01-01`; query = query.where('actionDate', '>=', startDate); }
        
        AppState.listeners.assignments = query.onSnapshot(snap => {
            AppState.assignments = [];
            snap.forEach(d => AppState.assignments.push({id:d.id, ...d.data()}));
            AppState.assignments.sort((a,b)=>(b.internalId||'').localeCompare(a.internalId||''));
            UI.updateView();
            $('#db-status').attr('title', `Loaded ${AppState.assignments.length} records`);
            if(year !== 'all') { $('#status-text').text(`Online (${year})`); } else { $('#status-text').text(`Online (All)`); }
        }, err => { console.error("Snapshot Error:", err); $('#status-text').text('Error').parent().addClass('bg-red-100 text-red-700'); });
    },
    saveAssignment: async () => {
        $.LoadingOverlay("show", { text: "Processing..." });
        const docId = $('#doc-id').val();
        let saveCat = AppState.currentCategoryFilter === 'summary_dashboard' ? 'summary_plan' : AppState.currentCategoryFilter;
        const config = menuConfig[saveCat];
        if (!config) { $.LoadingOverlay("hide"); Swal.fire('Error','Please select a menu first','error'); return; }

        let fileUrl = $('#form-file-url').val();
        const fileInput = $('#form-file')[0];
        if (fileInput.files.length > 0) {
             try { $.LoadingOverlay("text", "Uploading to Drive..."); fileUrl = await Service.uploadToDrive(fileInput.files[0]); } 
             catch (uploadError) { $.LoadingOverlay("hide"); Swal.fire('Upload Failed', 'Cannot upload file.', 'error'); return; }
        }

        let data = { category: saveCat || '', internalId: $('#form-internal-id').val() || '', updatedAt: firebase.firestore.FieldValue.serverTimestamp(), jobType: Utils.getDropdownValue('form-job-type') || '', description: $('#form-desc').val() || '', agency: Utils.getDropdownValue('form-agency') || '', location: $('#form-location').val() || '', remark: $('#form-remark').val() || '', nsRespond: $('#form-ns-respond').val() || [], };
        
        if (saveCat === 'summary_plan') {
            data.routeCode = $('#form-route-code').val(); data.electricDistrict = $('#form-electric-district').val(); data.routeName = $('#form-route-name').val(); data.sideCount = $('#form-side-count').val(); data.gpsStart = $('#form-gps-start').val(); data.gpsEnd = $('#form-gps-end').val(); data.distance = $('#form-distance').val(); data.owner = $('#form-owner').val(); data.crossReq = $('#form-cross-req').val(); data.dueDate = $('#form-due-date-summary').val();
            let symVal = $('#form-sym-impact').val(); if(symVal === 'Other') { symVal = $('#form-sym-impact-other').val(); } data.symImpact = symVal;
            const existingItem = docId ? AppState.assignments.find(a => a.id === docId) : null; data.actionDate = existingItem ? existingItem.actionDate : new Date().toISOString(); data.planDate = null;
        } else if (config.isPlan) {
            const pDate = $('#form-plan-date').val(); const pStart = $('#form-plan-start').val(); const pEnd = $('#form-plan-end').val(); 
            data.actionDate = (pDate && pStart) ? `${pDate}T${pStart}` : (pDate ? `${pDate}T00:00` : new Date().toISOString()); 
            data.planDate = pDate; data.planStartTime = pStart; data.planEndTime = pEnd; data.sentPlanDate = $('#form-sent-plan-date').val(); data.unplannedImpact = $('#form-unplanned-impact').val(); data.cmId = $('#form-interruption-id-cm').val(); data.project = Utils.getDropdownValue('form-project'); data.itemCount = $('#form-interruption-item').val(); data.teamReq = Utils.getDropdownValue('form-team-req');
        } else {
            const actDate = $('#form-action-date-d').val(); const actTime = $('#form-action-date-t').val();
            if (actDate) { data.actionDate = actTime ? `${actDate}T${actTime}` : `${actDate}T00:00`; } else { data.actionDate = ''; }
            data.fileName = $('#file-name-display').text(); data.fileUrl = fileUrl; data.gps = $('#form-gps').val();
            if (config.isSub) { data.dueDate = $('#form-due-date-sub').val(); data.objective = $('#form-objective').val(); data.expenses = $('#form-expenses').val(); data.routeCode = $('#form-route-code-sub').val(); data.subcontractor = $('#form-sub-name').val(); }
            else { data.dueDate = $('#form-due-date').val(); data.teamReq = Utils.getDropdownValue('form-team-req'); data.reqPerson = $('#form-req-person').val(); data.refJobId = $('#form-ref-job-id').val(); }
        }

        if(!docId) { data.createdAt = firebase.firestore.FieldValue.serverTimestamp(); data.status = 'new'; }
        try {
            const nowIso = new Date().toISOString();
            if(docId) {
                await Utils.getAssignmentsRef().doc(docId).update(data);
                const existingItem = AppState.assignments.find(a => a.id === docId);
                if (existingItem) { await Service.sendToSheet({ ...existingItem, ...data, updatedAt: nowIso }, config.sheetName); }
            } else {
                await Utils.getAssignmentsRef().add(data);
                if(config.isSub && data.jobType !== 'Special Job') { await Service.updateRoundRobinIndex(false, data.description); }
                await Service.sendToSheet({ ...data, createdAt: nowIso, updatedAt: nowIso }, config.sheetName);
            }
            $.LoadingOverlay("hide"); UI.closeModal(); Swal.fire('Saved', '', 'success');
        } catch(e) { $.LoadingOverlay("hide"); Swal.fire('Error', e.message, 'error'); }
    },
    updateStatus: (id, status, extra) => {
        $.LoadingOverlay("show");
        Utils.getAssignmentsRef().doc(id).update({status: status, ...extra}).then(async () => {
            const item = AppState.assignments.find(a => a.id === id);
            if(item) { const u = {...item, status, ...extra}; const c = menuConfig[u.category]; if(c) await Service.sendToSheet(u, c.sheetName); }
            $.LoadingOverlay("hide");
        }).catch(e => { $.LoadingOverlay("hide"); Swal.fire('Error',e.message,'error'); });
    },
    deleteAssignment: (id) => {
        Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then((r) => { if (r.isConfirmed) Utils.getAssignmentsRef().doc(id).delete(); });
    },
    generateNextInternalId: async () => {
        let targetCat = AppState.currentCategoryFilter === 'summary_dashboard' ? 'summary_plan' : AppState.currentCategoryFilter;
        const conf = menuConfig[targetCat];
        const now = new Date(); 
        const prefix = `${conf.prefix}${String(now.getFullYear()).slice(-2)}${String(now.getMonth()+1).padStart(2,'0')}`;
        const padLength = targetCat === 'summary_plan' ? 4 : 3;
        try { 
            const snapshot = await Utils.getAssignmentsRef().where('internalId', '>=', prefix).where('internalId', '<=', prefix + '\uf8ff').get(); 
            let maxNum = 0; 
            snapshot.forEach(doc => { const id = doc.data().internalId; if(id) { const num = parseInt(id.slice(prefix.length)); if(!isNaN(num) && num > maxNum) maxNum = num; } }); 
            return `${prefix}${String(maxNum + 1).padStart(padLength, '0')}`; 
        } catch(e) { return `${prefix}${String(1).padStart(padLength, '0')}`; }
    },
    uploadToDrive: async (file) => {
         return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = async function() { const content = reader.result.split(',')[1]; const formData = new URLSearchParams(); formData.append('action', 'upload'); formData.append('fileName', file.name); formData.append('mimeType', file.type); formData.append('fileData', content); try { const response = await fetch(GAS_URL, { method: 'POST', body: formData, redirect: 'follow' }); const result = await response.json(); if (result.status === 'success') { resolve(result.url); } else { reject(new Error(result.message)); } } catch (error) { reject(error); } }; reader.onerror = error => reject(error); reader.readAsDataURL(file); });
    },
    sendToSheet: async (data, sheetName) => {
        const fd = new URLSearchParams(); fd.append('action','save'); fd.append('sheetName',sheetName); fd.append('jobId',data.internalId); fd.append('fullData',JSON.stringify(data)); fetch(GAS_URL, {method:'POST', body:fd});
    },
    updateRoundRobinIndex: async (isSkip, jobName) => {
        const k = `rrIndexes.${AppState.currentCategoryFilter}`; const next = (AppState.masterData.rrIndexes?.[AppState.currentCategoryFilter]?.index || 0) + 1;
        await Utils.getSettingsRef().update({[k]: {index: next, lastJob: jobName}}).catch(() => Utils.getSettingsRef().set({rrIndexes:{[AppState.currentCategoryFilter]:{index:next, lastJob:jobName}}}, {merge:true}));
        UI.fetchRoundRobinState();
    },
    confirmClearDatabase: () => { Swal.fire({title:'Reset All?', icon:'warning', showCancelButton:true}).then(r=>{ if(r.isConfirmed) { Utils.getAssignmentsRef().get().then(s=>{ s.forEach(d=>d.ref.delete()); }); Service.initializeDatabase(true); } }); },
    initializeDatabase: (h) => { const d = { nsRespond: ["Support"], subcontractors: ["Sub A", "Sub B"], rrIndexes: {} }; Utils.getSettingsRef().set(d, {merge:true}); },
    testConnection: () => { Utils.getSettingsRef().get().then(()=>Swal.fire('OK','Connected','success')).catch(e=>Swal.fire('Fail',e.message,'error')); },
    getLocation: () => { if(!navigator.geolocation) { Swal.fire('Error','Browser not support','error'); return; } $.LoadingOverlay("show"); navigator.geolocation.getCurrentPosition(p => { $.LoadingOverlay("hide"); const loc = `${p.coords.latitude},${p.coords.longitude}`; const url = `https://www.google.com/maps?q=${loc}`; const old = $('#form-gps').val(); $('#form-gps').val(old ? old + '\n' + url : url); }, e => { $.LoadingOverlay("hide"); Swal.fire('Error',e.message,'error'); }); },
    
    // Setting Items
    addSettingItem: async (key, inputId) => { const value = $(`#${inputId}`).val(); if (!value) return; try { const ref = Utils.getSettingsRef(); const doc = await ref.get(); if (doc.exists) { await ref.update({ [key]: firebase.firestore.FieldValue.arrayUnion(value) }); } else { await ref.set({ [key]: [value] }, { merge: true }); } $(`#${inputId}`).val(''); Swal.fire({ icon: 'success', title: 'บันทึกเรียบร้อย', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 }); } catch (error) { console.error("Error adding setting:", error); Swal.fire('Error', 'บันทึกไม่สำเร็จ: ' + error.message, 'error'); } },
    removeSettingItem: (k, v) => { Utils.getSettingsRef().update({[k]: firebase.firestore.FieldValue.arrayRemove(v)}).catch(err => Swal.fire('Error', err.message, 'error')); },
    addNSRespond: () => { const n = $('#add-ns-name').val(); const p = $('#add-ns-phone').val(); if(n) { const val = p ? `${n} - ${p}` : n; Utils.getSettingsRef().update({nsRespond: firebase.firestore.FieldValue.arrayUnion(val)}).then(() => { $('#add-ns-name').val(''); $('#add-ns-phone').val(''); Swal.fire({ icon: 'success', title: 'เพิ่มข้อมูลเรียบร้อย', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 }); }).catch(err => Swal.fire('Error', err.message, 'error')); } },
    
    // Link Support Items
    saveLinkItem: async () => {
        const name = $('#ls-name').val().trim(); let url = $('#ls-url').val().trim(); const detail = $('#ls-detail').val().trim(); let type = $('#ls-type').val();
        if(type === 'Other') { const customText = $('#ls-type-other').val().trim(); type = customText ? `Other (${customText})` : 'Other'; }
        const editIndexStr = $('#ls-edit-index').val();
        if (!name || !url || !type) { Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อ, URL และประเภทให้ครบถ้วน', 'warning'); return; }
        if (!url.startsWith('http://') && !url.startsWith('https://')) { url = 'https://' + url; }
        const newItem = { name, url, type, detail };
        try {
            const ref = Utils.getSettingsRef(); const doc = await ref.get();
            if (doc.exists) {
                let currentLinks = doc.data().linkSupport || [];
                if (editIndexStr !== "") { const idx = parseInt(editIndexStr); if (idx >= 0 && idx < currentLinks.length) { currentLinks[idx] = newItem; await ref.update({ linkSupport: currentLinks }); Swal.fire({ icon: 'success', title: 'แก้ไขข้อมูลเรียบร้อย', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 }); } } 
                else { currentLinks.push(newItem); await ref.update({ linkSupport: currentLinks }); Swal.fire({ icon: 'success', title: 'เพิ่มลิงก์เรียบร้อย', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 }); }
            } else { await ref.set({ linkSupport: [newItem] }, { merge: true }); Swal.fire({ icon: 'success', title: 'เพิ่มลิงก์เรียบร้อย', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 }); }
            UI.cancelLinkEdit(); 
        } catch (error) { console.error("Error saving link:", error); Swal.fire('Error', 'บันทึกไม่สำเร็จ: ' + error.message, 'error'); }
    },
    deleteLinkItem: async (index) => {
        if(index === -1) return;
        Swal.fire({ title: 'ยืนยันการลบ?', text: "คุณต้องการลบลิงก์นี้ใช่หรือไม่", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก' }).then(async (result) => {
            if (result.isConfirmed) { try { const ref = Utils.getSettingsRef(); const doc = await ref.get(); if (doc.exists) { const currentLinks = doc.data().linkSupport || []; if (index >= 0 && index < currentLinks.length) { currentLinks.splice(index, 1); await ref.update({ linkSupport: currentLinks }); Swal.fire({ icon: 'success', title: 'ลบเรียบร้อย', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 }); if ($('#ls-edit-index').val() == index) UI.cancelLinkEdit(); } } } catch (error) { Swal.fire('Error', error.message, 'error'); } }
        });
    },

    // Action functions called by UI
    actionReceiveSummary: (id) => Service.updateStatus(id, 'process', { receiveDate: new Date().toISOString() }),
    actionCancelSummary: (id) => {
        const ops = (AppState.masterData.nsRespond || []).map(n => `<option value="${n}">${n}</option>`).join('');
        Swal.fire({ title: 'ยกเลิกงาน (Cancel Job)', html: `<div class="text-left space-y-3"><div><label class="text-sm font-bold text-gray-700 block mb-1">ผู้แจ้งยกเลิก (NS Respond) <span class="text-red-500">*</span></label><select id="cancel-ns" class="swal2-select w-full m-0 border border-gray-300 rounded p-2 text-sm"><option value="">เลือกชื่อ...</option>${ops}</select></div><div><label class="text-sm font-bold text-gray-700 block mb-1">สาเหตุการยกเลิก (Reason) <span class="text-red-500">*</span></label><input id="cancel-reason" class="swal2-input m-0 w-full text-sm" placeholder="ระบุสาเหตุ..."></div></div>`, showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ยืนยันยกเลิก', preConfirm: () => { const ns = document.getElementById('cancel-ns').value; const reason = document.getElementById('cancel-reason').value; if (!ns) Swal.showValidationMessage('กรุณาเลือกชื่อผู้แจ้งยกเลิก'); else if (!reason) Swal.showValidationMessage('กรุณาระบุสาเหตุ'); return { ns, reason }; } }).then((result) => { if (result.isConfirmed) { Service.updateStatus(id, 'cancel', { cancelBy: result.value.ns, cancelReason: result.value.reason, cancelDate: new Date().toISOString() }); } });
    },
    actionCompleteSummary: (id) => {
        Swal.fire({ title: 'ยืนยันจบงาน (Complete)', html: `<div class="text-left"><label class="text-sm font-bold text-gray-700 block mb-1">Project Code <span class="text-red-500">*</span></label><input id="comp-proj-code" class="swal2-input m-0 w-full text-sm" placeholder="ระบุเลข Project Code"></div>`, icon: 'question', showCancelButton: true, confirmButtonColor: '#22c55e', confirmButtonText: 'บันทึก (Complete)', preConfirm: () => { const code = document.getElementById('comp-proj-code').value; if (!code) Swal.showValidationMessage('กรุณาระบุ Project Code'); return code; } }).then((result) => { if (result.isConfirmed) { Service.updateStatus(id, 'complete', { projectCode: result.value, progressPercent: 100, completeDate: new Date().toISOString() }); } });
    },
    actionCancelPlan: (id) => {
        const ops = (AppState.masterData.nsRespond || []).map(n => `<option value="${n}">${n}</option>`).join(''); Swal.fire({ title: 'Cancel Job', html: `<div class="text-left"><label class="text-sm font-bold text-gray-700">ผู้แจ้งยกเลิก (NS Respond)</label><select id="cancel-ns" class="swal2-select w-full m-0 mb-3 border border-gray-300 rounded p-2"><option value="">เลือกชื่อ...</option>${ops}</select><label class="text-sm font-bold text-gray-700">สาเหตุการยกเลิก (Reason)</label><input id="cancel-reason" class="swal2-input m-0 w-full" placeholder="ระบุสาเหตุ..."></div>`, showCancelButton: true, confirmButtonColor: '#ef4444', preConfirm: () => { const ns = document.getElementById('cancel-ns').value; const reason = document.getElementById('cancel-reason').value; if (!ns) Swal.showValidationMessage('กรุณาเลือกชื่อผู้แจ้งยกเลิก'); return { ns, reason }; } }).then((result) => { if (result.isConfirmed) { Service.updateStatus(id, 'cancel', { cancelBy: result.value.ns, cancelReason: result.value.reason, cancelDate: new Date().toISOString() }); } });
    },
    actionReceivePlan: (id) => Service.updateStatus(id, 'process', { receiveDate: new Date().toISOString() }),
    actionCompletePlan: (id) => { Swal.fire({ title: 'ยืนยันงานเสร็จสิ้น?', text: "ต้องการเปลี่ยนสถานะเป็น Complete ใช่หรือไม่", icon: 'question', showCancelButton: true, confirmButtonColor: '#22c55e', confirmButtonText: 'ตกลง (Yes)' }).then((result) => { if (result.isConfirmed) { Service.updateStatus(id, 'complete', { completeDate: new Date().toISOString() }); } }); },
    actionUpdateFMS: (id) => { Swal.fire({ title: 'Update FMS', html: '<label class="block text-left text-sm mb-1">วันที่อัปเดต (Date)</label><input type="date" id="fms-date" class="swal2-input">', showCancelButton: true, preConfirm: () => { const d = document.getElementById('fms-date').value; if (!d) Swal.showValidationMessage('กรุณาใส่วันที่'); return d; } }).then((result) => { if (result.isConfirmed) { Service.updateStatus(id, 'update_fms', { fmsDate: result.value }); } }); },
    actionCancel: (id) => { Swal.fire({title: 'Cancel', input: 'text'}).then(r => { if(r.value) Service.updateStatus(id, 'cancel', {cancelReason: r.value}); }); },
    actionAssign: (id) => { Swal.fire({title: 'Assign', input: 'text', inputPlaceholder: 'ระบุเลข AS'}).then(r => { if(r.value) { Service.updateStatus(id, 'assign', { asNumber: r.value, assignDate: new Date().toISOString() }); } }); },
    actionApprove: (id) => { Swal.fire({title: 'Approve', text: 'ยืนยันการอนุมัติ?', showCancelButton:true}).then(r => { if(r.isConfirmed) { Service.updateStatus(id, 'approve', { approveDate: new Date().toISOString() }); } }); },
    actionFinish: (id) => { Swal.fire({title: 'Finish', input: 'text', inputPlaceholder: 'ระบุเลข SSF'}).then(r => { if(r.value) { Service.updateStatus(id, 'finish', { ssfNumber: r.value, ssfDate: new Date().toISOString() }); } }); },
    
    // Round Robin actions
    skipRoundRobin: () => { const nsList = AppState.masterData.nsRespond || AppState.masterData.NsRespond || []; const ops = nsList.map(n => `<option value="${n}">${n}</option>`).join(''); Swal.fire({ title: 'ข้ามคิว', html: `<input id="sk-r" class="swal2-input" placeholder="สาเหตุ"><select id="sk-b" class="swal2-input"><option value="">ผู้รับผิดชอบ</option>${ops}</select>`, showCancelButton: true, preConfirm:()=>{ return {r:$('#sk-r').val(), b:$('#sk-b').val()} } }).then(r => { if(r.isConfirmed) Service.updateRoundRobinIndex(true, `Skip: ${r.value.r}`); }); },
    resetRoundRobin: () => { Swal.fire({ title: 'Reset?', icon: 'warning', showCancelButton: true }).then(async r => { if(r.isConfirmed) { const k = `rrIndexes.${AppState.currentCategoryFilter}`; await Utils.getSettingsRef().update({[k]: {index:0, lastJob:'Reset'}}).catch(()=>Utils.getSettingsRef().set({rrIndexes:{[AppState.currentCategoryFilter]:{index:0, lastJob:'Reset'}}}, {merge:true})); UI.fetchRoundRobinState(); } }); },
};
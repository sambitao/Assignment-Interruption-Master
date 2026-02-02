const Utils = {
    getCollectionRef: (collectionName) => {
        if (!db) return null;
        return db.collection('artifacts').doc(appId).collection('public').doc('data').collection(collectionName);
    },
    getAssignmentsRef: () => Utils.getCollectionRef('assignments'),
    getSettingsRef: () => Utils.getCollectionRef('settings').doc('masterData'),
    
    fmtDate: (s, d) => { 
        if(!s) return '-'; 
        let dt; if(s.seconds) dt = new Date(s.seconds*1000); else dt=new Date(s); 
        if(isNaN(dt.getTime())) return '-'; 
        const day=dt.getDate(), m=dt.getMonth()+1, y=dt.getFullYear()+543, h=String(dt.getHours()).padStart(2,'0'), mn=String(dt.getMinutes()).padStart(2,'0'); 
        return d ? `${day}/${m}/${y}` : `${day}/${m}/${y} ${h}:${mn}`; 
    },
    
    extractNS: (d) => { 
        const a=Array.isArray(d)?d:(d?[d]:[]); const names=[], phones=[]; 
        a.forEach(s=>{ if(s.includes(' - ')){ const p=s.split(' - '); names.push(p[0]); phones.push(p[1]); } else { names.push(s); } }); 
        return {names:names.join(', '), phones:phones.join(', ') || '-'}; 
    },
    
    fallbackCopyTextToClipboard: (text) => { 
        const textArea = document.createElement("textarea"); textArea.value = text; textArea.style.top = "0"; textArea.style.left = "0"; textArea.style.position = "fixed"; document.body.appendChild(textArea); textArea.focus(); textArea.select(); 
        try { const successful = document.execCommand('copy'); if(successful) Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'คัดลอกข้อความแล้ว', showConfirmButton: false, timer: 1500 }); } catch (err) { console.error('Fallback: Oops, unable to copy', err); } document.body.removeChild(textArea); 
    },
    
    getDropdownValue: (selectId) => {
        const val = $(`#${selectId}`).val();
        if (val === 'Other') {
            const customText = $(`#${selectId}-other`).val();
            return customText ? `Other (${customText})` : 'Other';
        }
        return val;
    },
    
    setDropdownValue: (selectId, value, list) => {
        if (!value) { $(`#${selectId}`).val('').trigger('change'); return; }
        if (list && list.includes(value)) { $(`#${selectId}`).val(value).trigger('change'); } 
        else { $(`#${selectId}`).val('Other').trigger('change'); $(`#${selectId}-other`).val(value).addClass('show'); }
    }
};
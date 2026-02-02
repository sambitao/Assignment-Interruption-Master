const UI = {
    toggleSidebar: () => { const s=document.getElementById('sidebar'); s.classList.toggle('-translate-x-full'); document.getElementById('sidebar-overlay').classList.toggle('hidden'); },
    toggleDesktopSidebar: () => { const s = document.getElementById('sidebar'); const btn = document.getElementById('desktop-toggle-btn'); if (s.classList.contains('lg:w-0')) { s.classList.remove('lg:w-0', 'lg:overflow-hidden', 'lg:border-none'); btn.classList.remove('rotate-180'); } else { s.classList.add('lg:w-0', 'lg:overflow-hidden', 'lg:border-none'); btn.classList.add('rotate-180'); } },
    toggleSubmenu: (id, btn) => { document.getElementById(id).classList.toggle('open'); btn.querySelector('.fa-chevron-down').classList.toggle('rotate-180'); },
    
    switchView: (v) => { AppState.currentView = v; UI.updateView(); },
    
    updateView: () => {
        $('.view-section').addClass('hidden');
        if(AppState.currentView === 'dashboard_analytics') { $('#view-dashboard-analytics').removeClass('hidden'); UI.renderDashboardCharts(); }
        else if(AppState.currentView === 'sub_dashboard') { $('#view-sub-dashboard').removeClass('hidden'); UI.renderSubDashboardCharts(); }
        else if(AppState.currentView === 'summary_dashboard') { $('#view-summary-dashboard').removeClass('hidden'); UI.renderSummaryDashboard(); }
        else if(AppState.currentView === 'calendar') { $('#view-calendar').removeClass('hidden'); UI.renderCalendar(); }
        else if(AppState.currentView === 'setting') { $('#view-setting').removeClass('hidden'); UI.renderSettings(); }
        else if(AppState.currentView === 'link_support') { $('#view-link-support').removeClass('hidden'); UI.renderLinkSupport(); }
        else {
            AppState.currentCategoryFilter = AppState.currentView;
            $('#view-datatable').removeClass('hidden');
            const config = menuConfig[AppState.currentCategoryFilter];
            $('#sub-dashboard, #team-dashboard, #plan-dashboard, #summary-plan-dashboard').addClass('hidden');
            if (config && config.isSub) { $('#sub-dashboard').removeClass('hidden'); UI.updateDashboard(); }
            else if (AppState.currentCategoryFilter === 'summary_plan') { $('#summary-plan-dashboard').removeClass('hidden'); UI.updateDashboard(); }
            else if (config && config.isPlan) { $('#plan-dashboard').removeClass('hidden'); UI.updateDashboard(); }
            else if (config && config.jobTypeKey === 'team') { $('#team-dashboard').removeClass('hidden'); UI.updateDashboard(); }
            UI.renderTable();
        }
        $('.nav-item').removeClass('bg-brand-50 text-brand-600 font-semibold active-nav');
        if(AppState.currentView === 'summary_plan' || AppState.currentView === 'summary_dashboard') { $('#summary-menu').addClass('open'); $(`a[data-view="${AppState.currentView}"]`).addClass('bg-brand-50 text-brand-600 font-semibold active-nav'); }
        else { $(`a[data-view="${AppState.currentView}"]`).addClass('bg-brand-50 text-brand-600 font-semibold active-nav'); }
    },

    renderTable: () => {
        const tbody = document.getElementById("table-body"); if(!tbody) return;
        const sv = $('#search-input').val().toLowerCase(), fs = $('#filter-status').val();
        const th = document.getElementById("table-header-row");
        const config = menuConfig[AppState.currentCategoryFilter];
        const thClass = "p-3 text-center align-middle whitespace-normal break-words font-semibold text-gray-700 bg-gray-50 border-b border-gray-200 min-w-[80px]";
        let cols = `<th class="${thClass}">Job ID</th>`;
        if (AppState.currentCategoryFilter === 'summary_plan') cols += `<th class="${thClass}">Job Type</th><th class="${thClass}">Project Code</th><th class="${thClass}">Route Name</th><th class="${thClass}">Distance</th><th class="${thClass}">Due Date</th><th class="${thClass}">Sym Impact</th><th class="${thClass}">Progress</th><th class="${thClass}">NS</th><th class="${thClass}">Status</th><th class="${thClass}">Action</th>`;
        else if (config && config.isSub) cols += `<th class="${thClass}">Job Type</th><th class="${thClass}">Desc</th><th class="${thClass}">Objective</th><th class="${thClass}">Expenses</th><th class="${thClass}">Route Code</th><th class="${thClass}">Action Date</th><th class="${thClass}">Subcontractor</th><th class="${thClass}">NS</th><th class="${thClass}">Location</th><th class="${thClass}">Status</th><th class="${thClass}">Action</th>`;
        else if (config && config.isPlan) cols += `<th class="${thClass}">Interruption Type</th><th class="${thClass}">Project</th><th class="${thClass}">Desc</th><th class="${thClass}">Agency</th><th class="${thClass}">Sent Plan Date</th><th class="${thClass}">Action Date</th><th class="${thClass}">Location</th><th class="${thClass}">Status</th><th class="${thClass}">NS</th><th class="${thClass}">Item</th><th class="${thClass}">Action</th>`;
        else cols += `<th class="${thClass}">Job Type</th><th class="${thClass}">Desc</th><th class="${thClass}">Action Date</th><th class="${thClass}">Due Date</th><th class="${thClass}">Team</th><th class="${thClass}">NS</th><th class="${thClass}">Location</th><th class="${thClass}">Status</th><th class="${thClass}">Action</th>`;
        $('#table-header').html(`<i class="fa-solid fa-list-ul mr-2 text-brand-500"></i> รายการงาน ${config ? config.title : 'All'}`); th.innerHTML = cols;

        AppState.filteredData = AppState.assignments.filter(a => {
            if (AppState.currentCategoryFilter !== 'dashboard_analytics' && AppState.currentCategoryFilter !== 'sub_dashboard' && a.category !== AppState.currentCategoryFilter) return false;
            if (fs !== 'all' && a.status !== fs) return false;
            const searchFields = [ a.internalId, a.description, a.location, a.jobType, a.agency, a.teamReq, a.subcontractor, a.project, (a.nsRespond || []).join(' ') ];
            return searchFields.join(' ').toLowerCase().includes(sv);
        });
        const total = AppState.filteredData.length, start = (AppState.currentPage - 1) * AppState.rowsPerPage, pageData = AppState.filteredData.slice(start, start + AppState.rowsPerPage);
        tbody.innerHTML = "";
        if (total === 0) { $('#empty-state').removeClass('hidden'); $('#data-table').addClass('hidden'); }
        else {
            $('#empty-state').addClass('hidden'); $('#data-table').removeClass('hidden');
            pageData.forEach(item => {
                const badge = `<span class="status-badge status-${item.status}">${item.status.toUpperCase().replace('_', ' ')}</span>`;
                const sub = config && config.isSub ? (item.subcontractor || '-') : (item.teamReq || '-');
                const acts = UI.getActionButtons(item, config && config.isSub, config && config.isPlan);
                let rowHtml = `<td class="p-3 text-center font-mono font-bold text-brand-600 text-xs">${item.internalId}</td>`;
                if (AppState.currentCategoryFilter === 'summary_plan') {
                    const progressVal = item.progressPercent || 0;
                    const progressColor = progressVal === 100 ? 'bg-green-500' : 'bg-yellow-500';
                    const progressHtml = item.status === 'process' ? `<div class="w-full bg-gray-200 rounded-full h-2.5 mb-1 cursor-pointer" onclick="UI.updateProgressSummary('${item.id}')" title="Click to update"><div class="${progressColor} h-2.5 rounded-full" style="width: ${progressVal}%"></div></div><div class="text-[10px] text-center font-bold text-gray-600 cursor-pointer" onclick="UI.updateProgressSummary('${item.id}')">${progressVal}% <i class="fa-solid fa-pen ml-1 text-gray-400 hover:text-brand-500"></i></div>` : `<div class="text-center font-bold text-gray-500 text-xs">${progressVal}%</div>`;
                    rowHtml += `<td class="p-3 text-xs">${item.jobType||'-'}</td><td class="p-3 text-center text-xs text-blue-500 truncate max-w-[150px] font-bold">${item.projectCode||'-'}</td><td class="p-3 text-xs truncate max-w-[400px]">${item.routeName||'-'}</td><td class="p-3 text-center text-xs">${item.distance||'-'}</td><td class="p-3 text-center text-xs">${item.dueDate ? Utils.fmtDate(item.dueDate, true) : '-'}</td><td class="p-3 text-center text-xs text-orange-600 font-medium">${item.symImpact||'-'}</td><td class="p-3 w-24 align-middle">${progressHtml}</td><td class="p-3 truncate max-w-[100px] text-xs">${Utils.extractNS(item.nsRespond).names}</td><td class="p-3 text-center">${badge}</td>`;
                } else if (config && config.isPlan) {
                    rowHtml += `<td class="p-3 text-xs">${item.jobType||'-'}</td><td class="p-3 text-xs">${item.project||'-'}</td><td class="p-3 truncate max-w-[400px]">${item.description||'-'}</td><td class="p-3 text-xs">${item.agency||'-'}</td><td class="p-3 text-center text-xs">${item.sentPlanDate ? Utils.fmtDate(item.sentPlanDate, true) : '-'}</td><td class="p-3 text-center text-xs">${item.planDate ? Utils.fmtDate(item.planDate, true) : '-'}</td><td class="p-3 truncate max-w-[100px] text-xs">${item.location||'-'}</td><td class="p-3 text-center">${badge}</td><td class="p-3 truncate max-w-[100px] text-xs">${Utils.extractNS(item.nsRespond).names}</td><td class="p-3 text-center text-xs">${item.itemCount||'0'}</td>`;
                } else {
                    rowHtml += `<td class="p-3 text-xs">${item.jobType||'-'}</td><td class="p-3 truncate max-w-[400px]">${item.description||'-'}</td>`;
                    if (config && config.isSub) rowHtml += `<td class="p-3 text-xs truncate max-w-[100px]">${item.objective||'-'}</td><td class="p-3 text-xs">${item.expenses||'-'}</td><td class="p-3 text-xs truncate max-w-[100px]">${item.routeCode||'-'}</td>`;
                    rowHtml += `<td class="p-3 text-center text-xs">${Utils.fmtDate(item.actionDate)}</td>`;
                    if(config && !config.isSub) rowHtml += `<td class="p-3 text-center text-xs">${item.dueDate ? Utils.fmtDate(item.dueDate, true) : '-'}</td>`;
                    rowHtml += `<td class="p-3 text-blue-600 font-medium text-xs">${sub}</td><td class="p-3 truncate max-w-[100px] text-xs">${Utils.extractNS(item.nsRespond).names}</td>`;
                    if (!(config && config.isPlan)) rowHtml += `<td class="p-3 truncate max-w-[100px] text-xs">${item.location||'-'}</td>`;
                    rowHtml += `<td class="p-3 text-center">${badge}</td>`;
                }
                let m = `<button onclick="UI.viewDetail('${item.id}')" class="text-gray-400 hover:text-green-600 mx-1"><i class="fa-solid fa-file-lines"></i></button>`;
                if(config && config.isSub) m += `<button onclick="UI.requestApprove('${item.id}')" class="text-gray-400 hover:text-purple-600 mx-1"><i class="fa-solid fa-money-bill-wave"></i></button>`;
                m += `<button onclick="UI.openModal('${item.id}')" class="text-gray-400 hover:text-blue-600 mx-1"><i class="fa-solid fa-pen-to-square"></i></button><button onclick="Service.deleteAssignment('${item.id}')" class="text-gray-400 hover:text-red-600 mx-1"><i class="fa-solid fa-trash-can"></i></button>`;
                if(item.fileUrl && !(config && config.isPlan)) m+= `<a href="${item.fileUrl}" target="_blank" class="text-gray-400 hover:text-blue-500 mx-1"><i class="fa-solid fa-cloud-arrow-down"></i></a>`;
                rowHtml += `<td class="p-3 text-center"><div class="flex items-center justify-center space-x-2"><div class="flex gap-1">${acts}</div><div class="h-4 w-px bg-gray-200"></div><div class="flex">${m}</div></div></td>`;
                tbody.insertAdjacentHTML('beforeend', `<tr class="hover:bg-gray-50 border-b border-gray-50">${rowHtml}</tr>`);
            });
        }
        $('#pagination-info').text(`Showing ${Math.min(start+1, total)}-${Math.min(start+pageData.length, total)} of ${total}`);
        $('#pagination-controls').html(`<button onclick="UI.changePage(${Math.max(1, AppState.currentPage-1)})" class="px-2 border rounded"><</button><button onclick="UI.changePage(${Math.min(Math.ceil(total/AppState.rowsPerPage), AppState.currentPage+1)})" class="px-2 border rounded">></button>`);
    },
    changePage: (p) => { 
        if (p < 1) p = 1; 
        const totalPages = Math.ceil(AppState.filteredData.length / AppState.rowsPerPage); 
        if (p > totalPages && totalPages > 0) p = totalPages; 
        AppState.currentPage = p; UI.renderTable(); 
    },
    changeRowsPerPage: () => { 
        const val = $('#rows-per-page').val(); 
        AppState.rowsPerPage = val === 'all' ? 99999 : parseInt(val); 
        AppState.currentPage = 1; UI.renderTable(); 
    },
    getActionButtons: (item, isSub, isPlan) => {
        if (AppState.currentCategoryFilter === 'summary_plan') {
            if (item.status === 'new') return `<button onclick="Service.actionReceiveSummary('${item.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] shadow-sm transition">Receive</button><button onclick="Service.actionCancelSummary('${item.id}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded text-[10px] shadow-sm ml-1 transition">Cancel Job</button>`;
            if (item.status === 'process') return `<button onclick="Service.actionCompleteSummary('${item.id}')" class="bg-green-500 hover:bg-green-600 text-white px-2 py-0.5 rounded text-[10px] shadow-sm transition">Complete</button><button onclick="Service.actionCancelSummary('${item.id}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded text-[10px] shadow-sm ml-1 transition">Cancel Job</button>`;
            return '-';
        }
        if (isPlan) {
            const cancelBtn = `<button onclick="Service.actionCancelPlan('${item.id}')" class="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] ml-1">Cancel Job</button>`;
            if (item.status === 'new') return `<button onclick="Service.actionReceivePlan('${item.id}')" class="bg-blue-500 text-white px-2 py-0.5 rounded text-[10px]">Receive</button>${cancelBtn}`;
            if (item.status === 'process') return `<button onclick="Service.actionCompletePlan('${item.id}')" class="bg-green-500 text-white px-2 py-0.5 rounded text-[10px]">Complete</button>${cancelBtn}`;
            if (item.status === 'complete') return `<button onclick="Service.actionUpdateFMS('${item.id}')" class="bg-cyan-600 text-white px-2 py-0.5 rounded text-[10px]">Update FMS</button>`;
            return '-';
        }
        if (!isSub) {
            if (item.status === 'new') return `<button onclick="Service.updateStatus('${item.id}','process',{receiveDate:new Date().toISOString()})" class="bg-yellow-500 text-white px-2 py-0.5 rounded text-[10px] mr-1">Receive</button><button onclick="Service.actionCancel('${item.id}')" class="bg-red-500 text-white px-2 py-0.5 rounded text-[10px]">Cancel</button>`;
            if (item.status === 'process') return `<button onclick="Service.updateStatus('${item.id}','complete',{completeDate:new Date().toISOString()})" class="bg-green-500 text-white px-2 py-0.5 rounded text-[10px]">Finish</button>`;
            return '-';
        }
        switch(item.status) {
            case 'new': return `<button onclick="Service.updateStatus('${item.id}','process',{receiveDate:new Date().toISOString()})" class="bg-yellow-500 text-white px-2 py-0.5 rounded text-[10px] mr-1">Receive</button><button onclick="Service.actionCancel('${item.id}')" class="bg-red-500 text-white px-2 py-0.5 rounded text-[10px]">Cancel</button>`;
            case 'process': return `<button onclick="Service.actionAssign('${item.id}')" class="bg-purple-500 text-white px-2 py-0.5 rounded text-[10px]">Assign</button>`;
            case 'assign': return `<button onclick="Service.actionApprove('${item.id}')" class="bg-cyan-500 text-white px-2 py-0.5 rounded text-[10px]">Approve</button>`;
            case 'approve': return `<button onclick="Service.actionFinish('${item.id}')" class="bg-green-500 text-white px-2 py-0.5 rounded text-[10px]">Finish</button>`;
            default: return '-';
        }
    },
    openModal: (id = null) => {
        $('#assignment-form')[0].reset(); $('#doc-id').val(''); $('.select2').val(null).trigger('change');
        if(!menuConfig[AppState.currentCategoryFilter] && AppState.currentCategoryFilter !== 'summary_dashboard') AppState.currentCategoryFilter = 'team'; 
        let targetCat = AppState.currentCategoryFilter === 'summary_dashboard' ? 'summary_plan' : AppState.currentCategoryFilter;
        const conf = menuConfig[targetCat];
        UI.renderDropdowns();
        $('.group-sub, .plan-only, .team-only, .not-plan-only, .summary-plan-only').addClass('hidden');
        $('.summary-plan-hide').removeClass('hidden'); 
        $('#rr-normal-view').removeClass('hidden'); $('#rr-special-view').addClass('hidden'); $('#form-manual-sub').empty().append('<option value="">เลือกผู้รับเหมา...</option>');
        if(targetCat === 'summary_plan') { $('#form-agency').removeAttr('required'); $('#label-agency').html('Agency Inf.'); } 
        else { $('#form-agency').attr('required', 'required'); $('#label-agency').html('Agency Inf. <span class="text-red-500">*</span>'); }
        if(targetCat === 'summary_plan' && !id) $('#summary-copy-actions').removeClass('hidden'); else $('#summary-copy-actions').addClass('hidden');
        
        if(conf.isSub) { 
            $('.group-sub').removeClass('hidden'); $('.not-plan-only').removeClass('hidden'); 
            const subs = AppState.masterData.subcontractors || AppState.masterData.Subcontractors || [];
            subs.forEach(s => $('#form-manual-sub').append(new Option(s, s)));
            if(!id) { $('#rr-action-buttons').show(); UI.fetchRoundRobinState(); } else { $('#rr-action-buttons').hide(); }
        } else if(targetCat === 'summary_plan') { $('.summary-plan-only').removeClass('hidden'); $('.summary-plan-hide').addClass('hidden'); }
        else if(conf.isPlan) { $('.plan-only').removeClass('hidden'); $('.not-plan-only').addClass('hidden'); }
        else { $('.team-only').removeClass('hidden'); $('.not-plan-only').removeClass('hidden'); }
        
        if(id) { 
            const item = AppState.assignments.find(a => a.id === id); 
            if(item) { 
                $('#doc-id').val(item.id); $('#form-internal-id').val(item.internalId);
                const activeKey = conf.jobTypeKey;
                Utils.setDropdownValue('form-job-type', item.jobType, CONST_DATA.jobTypes[activeKey]);
                $('#form-desc').val(item.description); Utils.setDropdownValue('form-agency', item.agency, CONST_DATA.agencies);
                if(conf.isSub && item.jobType === 'Special Job') { $('#rr-normal-view').addClass('hidden'); $('#rr-special-view').removeClass('hidden'); $('#form-manual-sub').val(item.subcontractor); }
                if (targetCat === 'summary_plan') {
                    $('#form-route-code').val(item.routeCode); $('#form-electric-district').val(item.electricDistrict); $('#form-route-name').val(item.routeName); $('#form-side-count').val(item.sideCount); $('#form-gps-start').val(item.gpsStart); $('#form-gps-end').val(item.gpsEnd); $('#form-distance').val(item.distance); $('#form-owner').val(item.owner); $('#form-cross-req').val(item.crossReq); $('#form-due-date-summary').val(item.dueDate); 
                    let impactVal = item.symImpact; if(impactVal && !['Impact','Non Impact','Other'].includes(impactVal)) { $('#form-sym-impact').val('Other').trigger('change'); $('#form-sym-impact-other').val(impactVal); } else { Utils.setDropdownValue('form-sym-impact', impactVal); }
                } else if(conf.isPlan) {
                    $('#form-plan-date').val(item.planDate || ''); $('#form-plan-start').val(item.planStartTime || ''); $('#form-plan-end').val(item.planEndTime || ''); $('#form-sent-plan-date').val(item.sentPlanDate || ''); $('#form-unplanned-impact').val(item.unplannedImpact || ''); 
                    Utils.setDropdownValue('form-team-req', item.teamReq, CONST_DATA.teamRequests); $('#form-interruption-id-cm').val(item.cmId); Utils.setDropdownValue('form-project', item.project, CONST_DATA.projects); $('#form-interruption-item').val(item.itemCount); 
                } else {
                    if(item.actionDate) { const parts = item.actionDate.split('T'); $('#form-action-date-d').val(parts[0]); if(parts.length > 1) $('#form-action-date-t').val(parts[1].substring(0, 5)); }
                }
                $('#form-location').val(item.location); $('#form-remark').val(item.remark); if(item.nsRespond) $('#form-ns-respond').val(item.nsRespond).trigger('change');
                if(conf.isSub) { $('#form-objective').val(item.objective); $('#form-expenses').val(item.expenses); $('#form-route-code-sub').val(item.routeCode); $('#form-sub-name').val(item.subcontractor); $('#rr-next-name').text(item.subcontractor); $('.rr-label.text-brand-600').text('ทีมที่รับงานนี้ (Assigned)'); }
                else { $('#form-due-date').val(item.dueDate); Utils.setDropdownValue('form-team-req', item.teamReq, CONST_DATA.teamRequests); $('#form-req-person').val(item.reqPerson); $('#form-ref-job-id').val(item.refJobId); $('#form-gps').val(item.gps); }
                if(conf.isSub) $('#form-due-date-sub').val(item.dueDate);
                if(item.fileName) { $('#file-name-display').text(item.fileName); }
                if(item.fileUrl) { $('#existing-file-link').removeClass('hidden').find('a').attr('href', item.fileUrl); }
                $('#modal-title').html('<span class="bg-brand-100 text-brand-600 p-2 rounded-lg mr-3"><i class="fa-solid fa-pen-to-square"></i></span> แก้ไขข้อมูล ' + conf.title); 
            }
        } else {
                Service.generateNextInternalId().then(newId => { $('#form-internal-id').val(newId); $('#display-internal-id').text(newId); });
                if(conf.isSub) { $('.rr-label.text-brand-600').text('ทีมที่ได้รับงานนี้ (Current)'); }
                $('#modal-title').html('<span class="bg-brand-100 text-brand-600 p-2 rounded-lg mr-3"><i class="fa-solid fa-plus"></i></span> บันทึกงานใหม่ ' + conf.title);
                $('#file-name-display').text('คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่'); $('#existing-file-link').addClass('hidden');
        }
        $('#assignment-modal').removeClass('hidden'); 
    },
    closeModal: () => $('#assignment-modal').addClass('hidden'),
    viewDetail: (id) => {
        const item = AppState.assignments.find(a => a.id === id); if(!item) return; const nsInfo = Utils.extractNS(item.nsRespond); const conf = menuConfig[item.category]; const isSub = conf && conf.isSub; const isPlan = conf && conf.isPlan; const fileLink = item.fileUrl ? `<a href="${item.fileUrl}" target="_blank" class="text-blue-500 hover:underline break-all">${item.fileUrl}</a>` : '-'; const fileDisplay = (item.fileUrl && (item.fileUrl.match(/\.(jpeg|jpg|gif|png)$/) != null || item.fileUrl.includes('googleusercontent') || item.fileUrl.includes('drive.google.com'))) ? `<br><img src="${item.fileUrl}" class="mt-2 rounded-lg max-h-48 object-cover border border-gray-200" alt="Attached Image">` : ''; let nextSubName = '-'; if (isSub && AppState.masterData.subcontractors) { const rr = AppState.masterData.rrIndexes?.[item.category]?.index || 0; const subList = AppState.masterData.subcontractors || []; if (subList.length > 0) nextSubName = subList[rr % subList.length]; } const createdStr = item.createdAt ? Utils.fmtDate(item.createdAt) : '-'; const actionDateStr = Utils.fmtDate(item.actionDate); let html = `<div class="text-left text-sm space-y-3 font-prompt">`;
        if (item.category === 'summary_plan') { html += `<div class="font-bold text-lg border-b pb-2 mb-3 text-brand-600 flex items-center"><i class="fa-solid fa-file-contract mr-2"></i> รายละเอียดงาน (Project Plan)</div><div class="grid grid-cols-12 gap-2 items-start"><div class="col-span-4 text-gray-500 font-bold">Job ID :</div><div class="col-span-8 font-mono font-bold text-gray-800">${item.internalId}</div></div><div class="grid grid-cols-12 gap-2 items-start"><div class="col-span-4 text-gray-500 font-bold">Job Type :</div><div class="col-span-8">${item.jobType || '-'}</div></div><div class="grid grid-cols-12 gap-2 items-start"><div class="col-span-4 text-gray-500 font-bold">Project Code :</div><div class="col-span-8 text-blue-600 font-bold">${item.projectCode || '-'}</div></div><div class="grid grid-cols-12 gap-2 items-start"><div class="col-span-4 text-gray-500 font-bold">Route Code :</div><div class="col-span-8 font-mono text-gray-700">${item.routeCode || '-'}</div></div><div class="grid grid-cols-12 gap-2 items-start"><div class="col-span-4 text-gray-500 font-bold">Route Name :</div><div class="col-span-8">${item.routeName || '-'}</div></div><div class="grid grid-cols-12 gap-2 items-start"><div class="col-span-4 text-gray-500 font-bold">Distance :</div><div class="col-span-8 font-bold">${item.distance || '-'} km.</div></div><div class="grid grid-cols-12 gap-2 items-start"><div class="col-span-4 text-gray-500 font-bold">Sym Impact :</div><div class="col-span-8 text-orange-600 font-bold">${item.symImpact || '-'}</div></div><div class="grid grid-cols-12 gap-2 items-start"><div class="col-span-4 text-gray-500 font-bold">Due Date :</div><div class="col-span-8">${item.dueDate ? Utils.fmtDate(item.dueDate, true) : '-'}</div></div><div class="grid grid-cols-12 gap-2 items-start"><div class="col-span-4 text-gray-500 font-bold">Progress :</div><div class="col-span-8"><span class="inline-block px-2 py-0.5 rounded text-white text-xs ${item.progressPercent===100?'bg-green-500':'bg-yellow-500'}">${item.progressPercent || '0'}%</span></div></div>`; }
        else if (isSub) { html += `<div class="font-bold text-lg border-b pb-2 mb-3 text-brand-600 flex items-center"><i class="fa-solid fa-clipboard-check mr-2"></i> รายการงานใหม่ (${conf.title})</div><div class="grid grid-cols-3 gap-1 items-start"><div class="col-span-1 text-gray-500 font-bold"><i class="fa-regular fa-clock mr-1"></i> วันที่บันทึก :</div><div class="col-span-2">${createdStr}</div></div><div class="grid grid-cols-3 gap-1 items-start"><div class="col-span-1 text-gray-500 font-bold"><i class="fa-solid fa-fingerprint mr-1"></i>
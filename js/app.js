$(document).ready(function() { 
    // Bind UI to Window for onclick access
    window.UI = UI;
    window.Service = Service;
    window.Utils = Utils;

    $('.select2').select2({ placeholder: "เลือกชื่อ", allowClear: true }); 
    $('#search-input').on('input', function() { AppState.currentPage = 1; UI.renderTable(); }); 
    $('#filter-status').on('change', function() { AppState.currentPage = 1; UI.renderTable(); }); 
    
    Service.initAuth(); 
    $('#form-file').change(function(e) { $('#file-name-display').text(e.target.files[0] ? e.target.files[0].name : 'Click to upload'); }); 
    
    // Dropdown change logic
    ['#form-job-type', '#form-agency', '#form-team-req'].forEach(id => { $(id).change(function() { if($(this).val() === 'Other') $(id + '-other').addClass('show'); else $(id + '-other').removeClass('show'); }); }); 
    $('#form-sym-impact').change(function() { if($(this).val() === 'Other') $('#form-sym-impact-other').addClass('show'); else $('#form-sym-impact-other').removeClass('show'); });
    $('#ls-type').change(function() { if($(this).val() === 'Other') { $('#ls-type-other').removeClass('hidden').addClass('block').focus(); } else { $('#ls-type-other').addClass('hidden').removeClass('block'); } });
    
    const sumDashSelect = $('#sum-dash-jobtype');
    if(sumDashSelect.length && sumDashSelect.children().length <= 1) { CONST_DATA.jobTypes.summary_plan.forEach(t => { sumDashSelect.append(new Option(t, t)); }); }
    
        // Logic เปลี่ยนกล่อง Round Robin ตาม Job Type
    $('#form-job-type').change(function() {
        const val = $(this).val();
        const isSubMenu = menuConfig[AppState.currentCategoryFilter]?.isSub;
        if (isSubMenu) {
            if (val === 'Special Job') { $('#rr-normal-view').addClass('hidden'); $('#rr-special-view').removeClass('hidden'); $('#form-sub-name').val($('#form-manual-sub').val()); } 
            else { $('#rr-normal-view').removeClass('hidden'); $('#rr-special-view').addClass('hidden'); UI.fetchRoundRobinState(); }
        }
    });
});
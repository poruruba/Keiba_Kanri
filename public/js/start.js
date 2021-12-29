'use strict';

//const vConsole = new VConsole();
//window.datgui = new dat.GUI();

const base_url = "";
const prefix = "keiba";
const year_list = [
    2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000,
];

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    data: {
        year_list: year_list,
        racelist_year: year_list[0],
        racelist: [],
        raceresult_raceid: 0,
        raceresult: null,
        edit_mode: false,
        bedinfo: {
            fuku: [],
            wide: [],
        },
        bedlist_year: year_list[0],
        bedlist: [],
    },
    computed: {
    },
    methods: {
        bedlist_export: function(){
            var bedlist = [];
            for( var i = 0 ; i < localStorage.length ; i++ ){
                let key = localStorage.key(i);
                if( key.startsWith(prefix) )
                    bedlist.push(JSON.parse(localStorage.getItem(key)));
            }
            var blob = new Blob([JSON.stringify(bedlist, null, "\t")], { type: "application/json" });
            var url = window.URL.createObjectURL(blob);
      
            var a = document.createElement("a");
            a.href = url;
            a.target = '_blank';
            a.download = "keiba.json";
            a.click();
            window.URL.revokeObjectURL(url);
        },
        bedlist_import: function(files){
            if (files.length <= 0) {
                this.hash_input = '';
                return;
            }
        
            var file = files[0];
            var reader = new FileReader();
            reader.onload = (theFile) => {
                var bedlist = JSON.parse(reader.result);
                for( var i = 0 ; i < bedlist.length ; i++ )
                    localStorage[prefix + bedlist[i].id] = JSON.stringify(bedlist[i]);
                this.bedlist_year_change();
                this.dialog_close('#file_import');
            };
            reader.readAsText(file);
        },
        bedlist_year_change: async function(){
            var bedlist = [];
            for( var i = 0 ; i < localStorage.length ; i++ ){
                let key = localStorage.key(i);
                if( key.startsWith(prefix + this.bedlist_year) )
                    bedlist.push(JSON.parse(localStorage.getItem(key)));
            }
            bedlist.sort((first, second) =>{
                var f = moment(first.date, 'YYYY年MM月DD日').unix();
                var s = moment(second.date, 'YYYY年MM月DD日').unix();
                return s - f;
            });
            this.bedlist = bedlist;
        },
        racelist_year_change: async function(){
            var params = {
                year: this.racelist_year
            };
            try{
                this.progress_open();
                var response = await do_post(base_url + "/keiba-racelist", params );
                console.log(response);
                this.racelist = response.result;
            }finally{
                this.progress_close();
            }
        },
        raceinfo_select: async function(id){
            console.log("raceinfo_select(" + id + ")");
            this.raceresult_raceid = id;
            this.edit_mode = false;
            await this.raceinfo_update();
            this.tab_select("#raceinfo");
        },
        raceinfo_update: async function(){
            var params = {
                race_id: this.raceresult_raceid
            };
            try{
                this.progress_open();
                var response = await do_post(base_url + "/keiba-raceresult", params );
                console.log(response);
                this.raceresult = response.result;
                this.bedlist_reload();
            }finally{
                this.progress_close();
            }
        },
        bedlist_reload: function(){
            var bedinfo = localStorage[prefix + this.raceresult_raceid];
            if( !bedinfo ){
                this.bedinfo = {
                    id: this.raceresult_raceid,
                    title: this.raceresult.raceInfo.title,
                    date: this.raceresult.raceInfo.date,
                    odsResult: this.raceresult.odsResult,
                    fuku: [],
                    wide: [],
                }
            }else{
                this.bedinfo = JSON.parse(bedinfo);
            }
        },
        change_edit_mode: function(enable){
            this.bedlist_reload();
            this.edit_mode = enable;
        },
        commit_bed: function(){
            var nodata = false;
            do{
                if( this.bedinfo.tan > 0 ) break;
                if( this.bedinfo.fuku.filter(item => item > 0).length > 0 ) break;
                if( this.bedinfo.waku > 0 ) break;
                if( this.bedinfo.uren > 0 ) break;
                if( this.bedinfo.wide.filter(item => item > 0).length > 0 ) break;
                if( this.bedinfo.utan > 0 ) break;
                if( this.bedinfo.sanfuku > 0 ) break;
                if( this.bedinfo.santan > 0 ) break;
                nodata = true;
            }while(false);
            if( nodata ){
                localStorage.removeItem(prefix + this.bedinfo.id);
            }else{
                localStorage[prefix + this.bedinfo.id] = JSON.stringify(this.bedinfo);
            }
            this.change_edit_mode(false);
        },
        check_bed: function(race_id){
            var bedinfo = localStorage.getItem(prefix + race_id);
            if( !bedinfo )
                return false;
            bedinfo = JSON.parse(bedinfo);
            var nodata = false;
            do{
                if( bedinfo.tan > 0 ) break;
                if( bedinfo.fuku.filter(item => item > 0).length > 0 ) break;
                if( bedinfo.waku > 0 ) break;
                if( bedinfo.uren > 0 ) break;
                if( bedinfo.wide.filter(item => item > 0).length > 0 ) break;
                if( bedinfo.utan > 0 ) break;
                if( bedinfo.sanfuku > 0 ) break;
                if( bedinfo.santan > 0 ) break;
                nodata = true;
            }while(false);
            return !nodata;
        }
    },
    created: function(){
    },
    mounted: function(){
        proc_load();

        this.racelist_year = new Date().getFullYear();
        this.bedlist_year = this.racelist_year;
        this.racelist_year_change();
        this.bedlist_year_change();
    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
  
window.vue = new Vue( vue_options );

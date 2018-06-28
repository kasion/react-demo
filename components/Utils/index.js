import qs from 'qs';

import style from './index.css';
import hmiBridge from '@en/hmi';


export function setSessionStorageItems(key,value){
    window.sessionStorage.setItem(key,JSON.stringify(value));
}

export function removeSessionStorageItem(key){
    window.sessionStorage.removeItem(key);  
}

export function getSessionStorageItems(key){
    var data = window.sessionStorage.getItem(key);
    if(hasProperty(data)){
        return JSON.parse(data);
    }else{
        return null;
    }
}

window.gotoPage = gotoPage;
export function gotoPage(menu,siteId,appId,openWindow){
    if(hmiBridge.update)
        hmiBridge.update(menu,siteId,appId);
    else 
        window.open(menu.split('/')[0] + ".html", openWindow?'_blank':'_self');
}


//****************************************************** GA ***************************************/
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','gga');

gga('create', 'UA-104880320-1', 'auto');
gga('send', 'pageview');

window.ga = function (eventType, event) {
    var page = location.pathname;
    eventType = eventType == "loading" ? "pageview" : eventType;
    if(eventType=="pageview"){
        gga('send', 'pageview',page);
    }else{
        gga('send','event', 'button','click',event);
    }
    
    api('/siteds/log/insert',{
        page:page,
        type:eventType,
        client:'pc',
        operation:event,
        app:'siteds'
    });
    console.info('ga:',eventType, event);
}
//****************************************************** GA ***************************************/


//loading界面，供ajax使用
var loading = document.createElement('div');
var xhrs = [];
~function(){
    loading.className = style.blackback;
    document.body.appendChild(loading);
    
    loading.innerHTML = `<div class="${style.loading}">
        <svg viewBox="16 -16 1000 1000">
            <path fill="#0096D9" d="M285,531c103,0,267,72,427,72c130,0,196-58,196-138
                c0-215-182-387-393-387c-6,0-6,6,0,7c163,20,291,165,291,288
                c0,33-22,62-61,62c-106,0-268-72-427-72c-130,0-196,58-196,138
                c0,215,182,387,393,387c6,0,6-6,0-7c-162-19-291-165-291-288
                C224,560,246,531,285,531"/>
            <path fill="#8FC31F" d="M468,119c-86-7-166,19-214,54c-4,3-1,8,2,5
                c99-51,276-30,316,38c5,9,1,15-25,8c-197-45-339,2-412,122
                c-1,2,1,4,3,1c96-107,317-70,485-22c98,28,105-19,82-68
                C687,212,609,131,468,119"/>
            <path fill="#0065AC" d="M563,849c86,7,167-19,215-54c4-3,1-8-2-5
                c-99,51-278,30-318-38c-5-9-1-15,25-8
                c197,45,339-2,412-122c1-3-1-4-3-1
                c-96,107-317,70-485,22c-98-28-105,19-82,68
                C344,756,422,837,563,849"/>
        </svg>

        <div class="${style.logo}" />
    </div>`;

    setInterval(()=>loading.style.display = (xhrs = xhrs.filter(xhr=>xhr.readyState!=4)).length>0?'block':'none',100);
}();


export var api = (url,data={},method='POST',showLoading=false)=>new Promise((resolve,reject)=>{
    method = method.toUpperCase();
    var xhr = new XMLHttpRequest();

    try{xhr.responseType = 'json'}catch(e){}
    try{xhr.withCredentials = true}catch(e){}

    if(!url.startsWith('http') && !url.startsWith('/'))
        url = '/siteds/' + url;
    if(method == 'GET'){
        url += (url.indexOf('?')>=0 ? '&' : '?') + qs.stringify(data);
        xhr.open(method, url);
        xhr.setRequestHeader('locale',locale);
        xhr.send();
    }else{
        xhr.open(method, url);
        xhr.setRequestHeader("Content-Type","application/json"); 
        xhr.setRequestHeader('locale',locale);
        xhr.send(JSON.stringify(data));
    }
    
    if(showLoading)
        xhrs.push(xhr);
           

    xhr.onload = function() {       
        if(xhr.status != 200) return reject(xhr.status);

        var response = xhr.response;
        
        if(typeof response =='string')
            try{
                response = JSON.parse(response);
            }catch(e){
                return reject(xhr);
            }

        if(response.code == '10000')
            resolve(response.data)
        else if(response.code == 'LOGIN_30000'){
            hmiBridge.Logout && hmiBridge.Logout();
            reject(response.code);
        }else
            reject(response.code)
    }

    xhr.onerror = ()=>reject(xhr);
});



//定时调用
//只需调用一次，就会循环调用传入的函数，等函数执行完后再等待20秒，再循环调用
//再度调用该函数，将打破之前的循环，不会再执行之前的回调函数，开启新的循环
/*
    @promise    为定时到时的时候执行的函数，必须返回一个promise，从promise完成时，会调用@callback
                promise(firstTime)，它被调用时，会得知是否是第一次调用，一般用于决定是否显示loading
                如果有多个ajax请求，则使用Promise.all函数，这时callback被调用时，会传入一个数组，数组内是对应的返回数据
    @callback   当promise完成时，被调用的后续处理函数，带有data入参，为promise的返回结果
                callback(data),当promise函数内使用的是Promise.all时，这里的data为数组
                callback也可以是promise，下次调用会等callback的promise完成后调用
                如果不想进入下一次循环了，return true。
    @interval   为定时毫秒数，默认20000
    @name       用于区分不同的调用，以便一个页面同时存在多个循环调用，如果只有一个循环调用，则可以省略
    @identity   无需传入


    典型调用模板:
    import {loop,api} from 'Utils';

    function click(){//something clicked
        loop(
            firstTime=>Promise.all([api('/API1'),api('/API2')])
            ,
            ([dataFromAPI1,dataFromAPI2]) => dealWithData(dataFromAPI1,dataFromAPI2)
        )
    }
    
*/
var loopData = {}
export function loop(promise,callback,interval=20000,name='',identity = loopData[name] = Math.random()){
    // 如果是初次调用，则产生新的identity，覆盖原来的identity
    // 如果identity和当前id不一样，说明是旧的loop内发起的调用，忽略掉
    // 如果传入的identity和当前的id一致,说明是由下面的loop内调用的，继续loop
    return identity === loopData[name] 
    && promise(!arguments[4])//loop中调用的loop会携带当时的identity，所以如果有identity，就不用show loading（!arguments[4]）
    .then(data=>loopData[name]===identity && callback(data))
    .then(e=>setTimeout(e=>loop(promise,callback,interval,name,identity),interval))
    .catch(e=>setTimeout(e=>loop(promise,callback,interval,name,identity),interval)+console.error(e));//用catch是因为即使api调用失败，也要继续loop，万一哪天又好了呢？
}

export function validNumber(value) {
    return !(value === null || value === '' || value===undefined || value==='-' || value == -1 || value === 'null' || !isFinite(value));
}

//对数字进行格式化。
//@value : 目标数字. 
//@digit：保留几位小数，默认0. 
//@thousand:是否要千分符格式化
//
//example:
// fmt(1302032.32434,3)
// => 1302032.324
//
// fmt(1302032.32434,3,true)
// => 1,302,032.324

export function fmt(value,digit,thousand=true){
    if(!validNumber(value)) return '-';

    value = (Number(value) || 0).toFixed(digit);

    //加千分符
    if(thousand && value.indexOf('e')<0){//科学计数法不需要加千分符
        //取符号
        let sign = value[0]==='-' ? '-' : '';
        if(sign)value = value.slice(1);

        //小数点位置
        let point = value.indexOf('.');

        //没有小数点，小数点就在最后一位
        if(point === -1)point = value.length;

        //整数部分
        let big = value.slice(0,point).split('');

        let res = value.slice(point);//取小数部分
        for(let i=0;i<big.length;i++){
            res = big[big.length - i - 1] + res;//从个位开始往前累加
            if(i % 3 === 2 && i <big.length-1)//每三位加一个逗号，最后一位不加
                res = ',' + res;
        }

        value = sign + res;//拼上符号
    }

    return value;
}
//window.fmt = fmt;

//日期格式化
export function fmtDate(date, fmt = 'yyyy-MM-dd HH:mm:ss'){
    let o = {
        "M+": date.getMonth() + 1,
        "d+": date.getDate(),
        "H+": date.getHours(),
        "m+": date.getMinutes(),
        "s+": date.getSeconds(),
        "q+": Math.floor((date.getMonth() + 3) / 3),
        "S": date.getMilliseconds()
    };
    if(/(y+)/.test(fmt)){
        fmt = fmt.replace(RegExp.$1,(date.getFullYear()+"").substr(4 - RegExp.$1.length));            
    }
    
    for (var k in o) {        
        if(new RegExp("(" + k + ")").test(fmt)){
            fmt = fmt.replace(RegExp.$1,(RegExp.$1.length == 1) ? 
                (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));                                    
        }
    }
    return fmt;
}


/**
 * 计算两个日期之间的天数
 * @param date1
 * @param date2
 * @returns 日期间的天数
 */
export function dateDiff(date1, date2){       
    var type1 = typeof date1, type2 = typeof date2;       
    if(type1 == 'string')       
        date1 = stringToTime(date1);       
    else if(date1.getTime)       
        date1 = date1.getTime();       
    if(type2 == 'string')       
        date2 = stringToTime(date2);       
    else if(date2.getTime)       
        date2 = date2.getTime();   
    return (date2 - date1) / 1000 / 60 / 60 / 24;//除1000是毫秒，不加是秒   
}  

/**
 * 字符串转成Time(dateDiff)所需方法 
 * @param string 2014-01-01 10:23:23
 * @returns 字符串转成的日期对象
 */ 
export function stringToTime(string){       
    var f = string.split(' ', 2);       
    var d = (f[0] ? f[0] : '').split('-', 3);       
    var t = (f[1] ? f[1] : '').split(':', 3);       
    return (new Date(       
    parseInt(d[0], 10) || null,       
    (parseInt(d[1], 10) || 1)-1,       
    parseInt(d[2], 10) || null,       
    parseInt(t[0], 10) || null,      
    parseInt(t[1], 10) || null,       
    parseInt(t[2], 10) || null)).getTime();   
}

 //得到标准时区的时间,参数i为时区值数字，比如北京为东八区则输入8,西5输入-5
export function getLocalTime(i) {
    if (isNaN(i) || typeof i !== 'number') return null;
    var d = new Date();
    //得到1970年一月一日到现在的秒数
    var len = d.getTime();
    //本地时间与GMT时间的时间偏移差
    var offset = d.getTimezoneOffset() * 60000;
    //得到现在的格林尼治时间
    var utcTime = len + offset;
    return new Date(utcTime + 3600000 * i);
}

//格式化模版字符串
export var fmtString = (tmpl,values)=>tmpl.replace(/{\d+}/g, o=>values[o.slice(1,-1)]);
//console.log(fmtString('afds{0},{1}--{0}',[1,2]));


//获取search参数
export function getQueryString(name){
    return qs.parse(location.search.slice(1))[name];
}

//获取cookie
export function getCookie( name ) { 
	var start = document.cookie.indexOf( name + "=" ); 
   	var len = start + name.length + 1; 
    if ( ( !start ) && ( name != document.cookie.substring( 0, name.length ) ) ) { 
        return null; 
    } 
    if ( start == -1 ) return null; 
    var end = document.cookie.indexOf( ';', len ); 
    if ( end == -1 ) end = document.cookie.length; 
    return unescape( document.cookie.substring( len, end ) ); 
} 

// 获取语言
export var language  = (
	   getQueryString('locale')
    || getQueryString('lang')
    || getQueryString('language')
    || navigator && navigator.languages && navigator.languages[0]
    || navigator.userLanguage 
    || 'zh-CN'
).substr(0,2);

export var locale = {en:'en-US',zh:'zh-CN'}[language];

// 格式化数字，根据数字大小，自动带上k，m，g
export function formatProd(value,digit=2,thousand=true){
    if(value < 1000) 
        return fmt(value,digit,thousand);
    if( value < 1000000)
        return fmt(value / 1000,0,thousand) + 'k';
    if( value < 1000000000)
        return fmt(value / 1000000,2,thousand) + 'M';
    if (true) 
        return fmt(value / 1000000000,2,thousand) + 'G';
}




//获取日期在当年是第几周，以周一为第一天，周四为年界，周四在哪那年，本周就算哪年的
export function getWeek(date) {      
    date.setHours(0, 0, 0, 0);    
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);    
    let week1 = new Date(date.getFullYear(), 0, 4);    
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

/**
 * 获取传入时间月份的最后一天
 * 如:date = 2016-08-01 00:00:00
 * 则返回 2016-08-31 23:59:59.999
 */
export function getCurrentMonthLastDay(date = new Date()){
    return new Date(date.getFullYear(),date.getMonth()+1,1,0,0,0,-1);
}

export function hasProperty(obj) {
    for(let item in obj){
        return true;
    }
    return false;
}


export function isIE11() {
    var iev = 0;
    var ieold = (/MSIE (\d+\.\d+);/.test(navigator.userAgent));
    var trident = !!navigator.userAgent.match(/Trident\/7.0/);
    var rv = navigator.userAgent.indexOf("rv:11.0");

    if (ieold) {
      iev = Number(RegExp.$1);
    }
    if (navigator.appVersion.indexOf("MSIE 10") !== -1) {
      iev = 10;
    }
    if (trident && rv !== -1) {
      iev = 11;
    }

    return iev === 11;
}

export function isEdge() {
    return /Edge\/12/.test(navigator.userAgent);
}

function getDownloadUrl(text) {
    var BOM = "\uFEFF";
    // Add BOM to text for open in excel correctly
    if (window.Blob && window.URL && window.URL.createObjectURL) {
      var csvData = new Blob([BOM + text], { type: 'text/csv' });
      return URL.createObjectURL(csvData);
    } else {
      return 'data:attachment/csv;charset=utf-8,' + BOM + encodeURIComponent(text);
    }
}

export function download(filename, title,data) {
    data = [title].concat(data);
    var text = data.map(line=>'"'+line.map(cell=>(cell+'').replace(/"/g,'""')).join('","')).join('"\r\n');

    if (isIE11() || isEdge()) {
        let BOM = "\uFEFF";
        let csvData = new Blob([BOM + text], { type: 'text/csv' });
        navigator.msSaveBlob(csvData, filename);
    } else {
        var link = document.createElement("a");
        link.href = getDownloadUrl(text);
        link.download = filename;

        document.body.appendChild(link);

        let ev = document.createEvent("MouseEvents");
        ev.initEvent("click", true , true );
        link.dispatchEvent(ev);

        document.body.removeChild(link);
    }
}

//深度克隆obj,能支持带循环引用的obj
export function CloneObject(obj){
    var map = new Map();

    function clone(obj){
        var copy;
        switch(Object.prototype.toString.call(obj)){
            case '[object Function]':return undefined;break;
            case '[object Array]':copy=[];break;
            case '[object Object]':copy={};break;
            default:return obj;
        }
        
        if(map.has(obj))
            return map.get(obj);
        else
            map.set(obj,copy);

        for(var i in obj){
            copy[i] = clone(obj[i]);
        }

        return copy;
    }

    return clone(obj);
}

const leftpad = num => (100+num+'').substr(-2);

//根据type(年、月、日)返回当年、当月、当日 obj对象{beginTime:开始时间、endTime:结束时间、dateTime：xAxis时间数组、timeGroup:类型}
export function changeType(type){
    var obj ={
        beginTime:'',
        endTime:'',
        dateTime:[],
        timeGroup:''
    };
    var date = new Date();
    let dateFmt = date.getFullYear() + '-' + leftpad((date.getMonth()+1)) + '-' + leftpad(date.getDate());
    obj.endTime = dateFmt + ' 23:59:59';
    switch(type){
    case 'Y':
        obj.beginTime = date.getFullYear() + '-01-01 00:00:00';
        obj.timeGroup = 'M';
        for(let i=1;i<13;i++){
            obj.dateTime.push(date.getFullYear()+'-'+leftpad(i));
        }
        break;
    case 'M':
        obj.beginTime = date.getFullYear() + '-'+ leftpad((date.getMonth()+1))+'-01 00:00:00';
        obj.timeGroup = 'D';
        for(let i=1;i<=date.getDate(); i++){

            obj.dateTime.push(date.getFullYear()+ '-' + leftpad((date.getMonth()+1)) + '-' + leftpad(i));
        }
        break;
    case 'D':
        obj.beginTime = dateFmt + ' 00:00:00';
        obj.timeGroup = 'H';
        for(let i=0; i<=date.getHours();i++){
            obj.dateTime.push(dateFmt + ' ' + leftpad(i));
        }
        break;
    case 'm':
        obj.beginTime = dateFmt + ' 00:00:00';
        obj.timeGroup = 'm';
        //当日5分钟数据
        var time = new Date(date.getFullYear(),date.getMonth(),date.getDate(),0,0,0);
        //var timeEnd = new Date(date.getFullYear(),date.getMonth(),date.getDate(),23,59,59);
        while(time.getTime()<=date.getTime()){
            obj.dateTime.push(fmtDate(time));
            time.setTime(time.getTime() + 1000*60*5);
        }
        break;
    case 'sum':
        obj.beginTime = '1970-01-01 00:00:00';
        obj.endTime = date.getFullYear() + '-'+ leftpad((date.getMonth()+1)) + '-' + date.getDate() + ' 23:59:59';
        obj.timeGroup = 'Y';
        break;
    default:
        break;
    }

    return obj;
}

export function getTimeSpan(beginTime, endTime, type){
    let toDate = time=>typeof time === 'string' ? new Date(time) : time;

    beginTime = toDate(beginTime);
    endTime = toDate(endTime);

    let timeSpan = [];
    //new Date()是为了断开middleDate和beginTime的引用关系
    let middleDate = new Date(beginTime);

    let nextDate = {
        m: date=>date.setMinutes(date.getMinutes() + 5),
        H: date=>date.setHours(date.getHours() + 1),
        D: date=>date.setDate(date.getDate() + 1),
        M: date=>date.setMonth(date.getMonth() + 1),
        Y: date=>date.setFullYear(date.getFullYear() + 1)
    }[type];

    let fmt = {
        m: 'yyyy-MM-dd HH:mm:ss',
        H: 'yyyy-MM-dd HH',
        D: 'yyyy-MM-dd',
        M: 'yyyy-MM',
        Y: 'yyyy'
    }[type];

    while(middleDate <= endTime){
        timeSpan.push(fmtDate(new Date(middleDate), fmt));
        nextDate(middleDate);
    }
    return timeSpan;
}

//输入相对地址，返回完整地址
//比如url=‘abc.html’，return  'http://asdf.comf.com/dji/abc.html';
export function resolveUrl(url){
    var a = document.createElement('a');
    a.href = url;
    return a.href;
}

/**
 * 获取obj对象下的某个属性
 * obj: 目标对象
 * keys: 要获取的属性层级关系
 * 例如，obj = {a: {b: 2, c: 3}, d: 4}, keys = 'a?b', 则返回2
 * 如果没有找到对应的属性，则返回undefined
 */
export function getProperty(obj, keys) {
    if (obj == null || Object.prototype.toString.call(obj) != '[object Object]') throw new Error('obj is not a Object');    
    if (keys == null) throw new Error("keys can't be null");
    keys.split('?').map(key=>obj = obj[key]);
    return obj;
}


  


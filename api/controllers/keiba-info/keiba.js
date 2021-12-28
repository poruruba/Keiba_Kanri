'use strict';

const base_url = 'https://db.netkeiba.com';

const cheerio = require('cheerio');
const { URL, URLSearchParams } = require('url');
const fetch = require('node-fetch');
const Headers = fetch.Headers;
const Iconv  = require('iconv').Iconv;
const APICALL_WAIT = 3000;

class Keiba{
  constructor(){
    this.iconv = new Iconv("EUC-JP", 'UTF-8');
  }

  async getRaceResult(raceId){
    var html_eucjp = await do_get(base_url + "/race/" + raceId);
    const html = Buffer.from(this.iconv.convert(Buffer.from(html_eucjp))).toString();
//    console.log(html);
    await new Promise(resolve => setTimeout(resolve, APICALL_WAIT));

    return this.parseRaceResult(html);
  }

  async getRaceList(year){
    var params = {
      pid: "race_list",
      start_year: year,
      end_year: year,
      "grade[]": 1,
      sort: "date",
      list: 100,
    };
    var html_eucjp = await do_post_urlencoded_racelist(base_url, params);
    const html = Buffer.from(this.iconv.convert(Buffer.from(html_eucjp))).toString();
//    console.log(html);
    await new Promise(resolve => setTimeout(resolve, APICALL_WAIT));

    return this.parseRaceList(html);
  }

  parseRaceList(html){
    const $ = cheerio.load(html);

    var raceList = [];
    $('tr', '.nk_tb_common').each((i, elem) => {
      if( i == 0 ) return;
      // 開催日、開催、天気、R、レース名、映像、距離、頭数、馬場、タイム、ペース、勝ち馬、騎手、調教師、2着馬、3着馬
      // 開催日(0)、開催(1)、天気(2)、R(3)、レース名(4)、映像(5)、距離(6)、頭数(7)、馬場(8)、タイム(9)、ペース(10)、勝ち馬(11)、騎手(12)、調教師(13)、2着馬(14)、3着馬(15)
      var raceInfo = {};
      var tds = $(elem).find('td');
      raceInfo.id = $(tds[4]).find('a').attr('href').split('/')[2];
      raceInfo.date = $(tds[0]).find('a').text().trim();
      raceInfo.event = $(tds[1]).find('a').text().trim();
      raceInfo.weather = $(tds[2]).text().trim();
      raceInfo.race = parseInt($(tds[3]).text().trim());
      raceInfo.name = $(tds[4]).find('a').text().trim();
      raceInfo.movie = $(tds[5]).find('a').attr('href') ? (base_url + $(tds[5]).find('a').attr('href').trim()) : null;
      raceInfo.distance = $(tds[6]).text().trim();
      raceInfo.num_of_horse = parseInt($(tds[7]).text().trim());
      raceInfo.condition = $(tds[8]).text().trim();
      raceInfo.time = $(tds[9]).text().trim();
      raceInfo.pace = $(tds[10]).text().trim();
      raceInfo.winner = $(tds[11]).find('a').text().trim();
      raceInfo.jockey = $(tds[12]).find('a').text().trim();
      raceInfo.trainer = $(tds[13]).text().trim();
      raceInfo.second = $(tds[14]).find('a').text().trim();
      raceInfo.third = $(tds[15]).find('a').text().trim();

      raceList.push(raceInfo);
    });
  
    console.log(raceList);
  
    return raceList;
  }

  parseRaceResult(html){
  	console.log(html);
    const $ = cheerio.load(html);
  
    var raceInfo = {};
    raceInfo.title = $('h1').text().replace(/\n/g, "").trim();
    raceInfo.info1 = $('diary_snap_cut > span').text();
    raceInfo.info2 = $('.smalltxt').text();
    raceInfo.date = raceInfo.info2.split(" ")[0];

    var raceResult = [];
    $('tr', '.nk_tb_common').each((i, elem) => {
      if( i == 0 ) return;
      // 着順、枠番、馬番、馬名、性齢、斤量、騎手、タイム、着差、タイム指数、通過、上り、単勝、人気、馬体重、調教タイム、厩舎コメント、備考、調教師、馬主、賞金
      // 着順(0)、枠番(1)、馬番(2)、馬名(3)、性齢(4)、斤量(5)、騎手(6)、タイム(7)、着差(8)、タイム指数(9)、通過(10)、上り(11)、単勝(12)、人気(13)、馬体重(14)、調教タイム(15)、厩舎コメント(16)、備考(17)、調教師(18)、馬主(19)、賞金(20)
      var rankInfo = {};
      var tds = $(elem).find('td');
      rankInfo.order = parseInt($(tds[0]).text().trim());
      rankInfo.wakuban = parseInt($(tds[1]).text().trim());
      rankInfo.umaban = parseInt($(tds[2]).text().trim());
      rankInfo.name = $(tds[3]).text().trim();
      rankInfo.age = $(tds[4]).text().trim();
      rankInfo.kinryou = parseInt($(tds[5]).text().trim());
      rankInfo.jockey = $(tds[6]).text().trim();
      rankInfo.time = $(tds[7]).text().trim();
      rankInfo.difference = $(tds[8]).text().trim();
      rankInfo.pass = $(tds[10]).text().trim();
      rankInfo.last_time = parseFloat($(tds[11]).text().trim());
      rankInfo.tan_ods = parseFloat($(tds[12]).text().trim());
      rankInfo.rating = parseInt($(tds[13]).text().trim());
      rankInfo.weight = $(tds[14]).text().trim();
      rankInfo.trainer = $(tds[18]).text().replace(/\n/g, "").trim();
      rankInfo.owner = $(tds[19]).text().trim();
  
      var award = $(tds[20]).text().trim();
      if( award )
        rankInfo.award = parseKuraiFloat(award) * 10000;
      raceResult.push(rankInfo);
    });
  
    console.log(raceResult);
  
    var odsResult = {};
    $('tr', '.pay_table_01').each((i, elem) => {
      var type = $($(elem).find("th")[0]).attr("class");
      var items = $(elem).find('td');
      switch(type){
        case 'tan':{
          var item = {
            type: type,
            number: parseKuraiInt($(items[0]).text()),
            refund: parseKuraiInt($(items[1]).text())
          }
          odsResult[type] = item;
          break;
        }
        case 'waku':
        case 'uren':
        case 'utan':
        case 'sanfuku':
        case 'santan':
        {
          var item = {
            type: type,
            number: $(items[0]).text(),
            refund: parseKuraiInt($(items[1]).text())
          }
          odsResult[type] = item;
          break;
        }
        case 'fuku':{
          var item = {
            type: type,
            refunds: []
          };
  
          var numbers = $(items[0]).html().replace(/<[^>]*>/g, "<>").split("<>");
          var refunds = $(items[1]).html().replace(/<[^>]*>/g, "<>").split("<>");
          for( var i = 0 ; i < numbers.length ; i++ ){
            item.refunds.push({
              number: parseKuraiInt(numbers[i]),
              refund: parseKuraiInt(refunds[i])
            });
          }
  
          odsResult[type] = item;
          break;
        }
        case 'wide':{
          var item = {
            type: type,
            refunds: []
          };
  
          var numbers = $(items[0]).html().replace(/<[^>]*>/g, "<>").split("<>");
          var refunds = $(items[1]).html().replace(/<[^>]*>/g, "<>").split("<>");
          var no = $(items[2]).html().replace(/<[^>]*>/g, "<>").split("<>");
          for( var i = 0 ; i < numbers.length ; i++ ){
            item.refunds.push({
              number: numbers[i],
              refund: parseKuraiInt(refunds[i]),
              no: parseKuraiInt(no[i])
            });
          }
  
          odsResult[type] = item;
          break;
        }
      }
    });
  
    console.log(JSON.stringify(odsResult));
  
    return {
      raceInfo: raceInfo,
      raceResult: raceResult,
      odsResult: odsResult
    }
  }
}

function do_post_urlencoded_racelist(url, params) {
  const headers = new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' });
  var body = new URLSearchParams(params);
  body.append('jyo[]', "01");
  body.append('jyo[]', "02");
  body.append('jyo[]', "03");
  body.append('jyo[]', "04");
  body.append('jyo[]', "05");
  body.append('jyo[]', "06");
  body.append('jyo[]', "07");
  body.append('jyo[]', "08");
  body.append('jyo[]', "09");
  body.append('jyo[]', "10");

  return fetch(url, {
      method: 'POST',
      body: body,
      headers: headers
    })
    .then((response) => {
      if (!response.ok)
        throw 'status is not 200';
        
      return response.arrayBuffer();
    })
}

function do_get(url, qs) {
  var params = new URLSearchParams(qs);

  var params_str = params.toString();
  var postfix = (params_str == "") ? "" : ((url.indexOf('?') >= 0) ? ('&' + params_str) : ('?' + params_str));
  return fetch(url + postfix, {
      method: 'GET',
    })
    .then((response) => {
      if (!response.ok)
        throw 'status is not 200';
      return response.arrayBuffer();
    });
}

function parseKuraiInt(str){
  return parseInt(str.replace(/,/g, ""));
}

function parseKuraiFloat(str){
  return parseFloat(str.replace(/,/g, ""));
}

module.exports = new Keiba();
export const PALETTE = {
  w:{color:'#e4ded0',light:'#fffbee',dark:'#848899',points:50},
  o:{color:'#eb8b31',light:'#ffc469',dark:'#8b421e',points:60},
  c:{color:'#3ccee0',light:'#98f6f5',dark:'#19768d',points:70},
  g:{color:'#65c954',light:'#b1ed88',dark:'#307235',points:80},
  r:{color:'#e9514e',light:'#ff9c85',dark:'#8e272e',points:90},
  b:{color:'#507adb',light:'#91b5ff',dark:'#293d94',points:100},
  m:{color:'#c961cf',light:'#f6a6ee',dark:'#743587',points:110},
  y:{color:'#e2cf40',light:'#fff586',dark:'#8c7926',points:120},
  s:{color:'#9bb9c2',light:'#edf4e8',dark:'#4e687b',points:50},
  x:{color:'#d1a63e',light:'#ffe586',dark:'#886325',points:0},
};
export const POWERUPS = {
  E:{name:'ШИРОКАЯ ПЛАТФОРМА',color:'#347be0'}, L:{name:'ЛАЗЕР · ПРОБЕЛ / КЛИК',color:'#e8504b'},
  D:{name:'МУЛЬТИМЯЧ',color:'#33b8c7'}, C:{name:'ЗАХВАТ · ПРОБЕЛ ДЛЯ ПУСКА',color:'#42bd69'},
  S:{name:'ЗАМЕДЛЕНИЕ',color:'#e38e37'}, P:{name:'ДОПОЛНИТЕЛЬНАЯ ЖИЗНЬ',color:'#dc6aa5'},
  B:{name:'ВЫХОД СПРАВА →',color:'#a16cdb'},
};
const patterns=[
 ['sssssssssssss','rrrrrrrrrrrrr','ooooooooooooo','yyyyyyyyyyyyy','ggggggggggggg','ccccccccccccc','bbbbbbbbbbbbb'],
 ['w...........w','oo.........oo','ccc.......ccc','gggg.....gggg','rrrrr...rrrrr','bbbbbb.bbbbbb','mmmmmmwmmmmmm'],
 ['...yyy.yyy...','..ysss.sssy..','.ycwcwcwcwcy.','ycwgggggggwcy','ycwggrrrggwcy','ycwgggggggwcy','.ycwcwcwcwcy.','..ysss.sssy..','...yyy.yyy...'],
 ['rrrrrrrrrrrrr','r...........r','r.sss...sss.r','o.sgg...ggs.o','o.sgg...ggs.o','y.sss...sss.y','y...........y','ggggggggggggg'],
 ['.....xxx.....','....ccccc....','...bbbbbbb...','..mmmmmmmmm..','.rrrrrrrrrrr.','ooooooooooooo','......s......','......s......'],
 ['...w.....w...','..www...www..','.wwwwwwwwwww.','wwwsswwwsswww','wwwwwwwwwwwww','..wwwwwwwww..','...ww...ww...','..ww.....ww..'],
 ['rr.oo.yy.gg.cc','rr.oo.yy.gg.cc','rr.oo.yy.gg.cc','ss.ss.ss.ss.ss','bb.mm.rr.oo.yy','bb.mm.rr.oo.yy','bb.mm.rr.oo.yy'],
 ['xxxxxxxxxxxx.','rrrrrrrrrrrr.','.xxxxxxxxxxxx','.oooooooooooo','xxxxxxxxxxxx.','yyyyyyyyyyyy.','.xxxxxxxxxxxx','.gggggggggggg'],
 ['r.....s.....b','.r....s....b.','..r...s...b..','...r..s..b...','....r.s.b....','.....rsb.....','sssssswssssss','.....gsc.....','....g.s.c....'],
 ['rrr.......rrr','rrr..yyy..rrr','.....yyy.....','..bbb...ccc..','..bbb...ccc..','.....mmm.....','ggg..mmm..ggg','ggg.......ggg'],
 ['..sssssssss..','..srsssssss..','..srrssssss..','..srrrsssss..','..srrrrssss..','..srrrrrsss..','..srrrrrrss..','..sssssssss..'],
 ['...x.....x...','..oxo...oxo..','.oyyyo.oyyyo.','oygggyoygggyo','oygccgygccgyo','.oygcccccgyo.','..oygcccg yo..','...oygcgyo...','....oygyo....','.....oyo.....'],
 ['wwwwwwwwwwwww','wrrrrrrrrrrrw','wrxxxxxxxxxrw','wroyyyyyyyorw','wrogcccccgorw','wrogbbbbcgorw','wrogcccccgorw','wroyyyyyyyorw','wrrrrrrrrrrrw'],
 ['r.r.r.r.r.r.r','.o.o.o.o.o.o.','y.y.y.y.y.y.y','.g.g.g.g.g.g.','c.c.c.c.c.c.c','.b.b.b.b.b.b.','m.m.m.m.m.m.m','.s.s.s.s.s.s.'],
 ['.rrrr.rrrrrr.','r.....r......','rrrrr.rrrrr..','....r.r......','rrrrr.rrrrrr.','.............','sssssssssssss'],
 ['s..s..s..s..s','ss.ss.ss.ss.s','sss.sss.sss.s','rssorssoyssgs','rssorssoyssgs','rssorssoyssgs','...c..b..m...','...c..b..m...'],
 ['sssssssssssss','s..rr...rr..s','s.rrrr.rrrr.s','s.rrrrrrrrr.s','s..rrrrrrr..s','s...rrrrr...s','s....rrr....s','s.....r.....s','sssssssssssss'],
 ['...rrrrrrr...','..roooyooor..','.royygggyyor.','royggcccggyor','roygcbmbcgyor','royggcccggyor','.royygggyyor.','..roooyooor..','...rrrrrrr...'],
 ['xx.........xx','ss.........ss','rrr.......rrr','oooo.....oooo','yyyyy...yyyyy','gggggg.gggggg','ccccccwcccccc','bbbbbb.bbbbbb'],
 ['srrrrrrrrrrrs','s...........s','s.sooooooos.s','s.s.......s.s','s.s.syyys.s.s','s.s.s...s.s.s','s.s.sgggs.s.s','s.scccccccs.s','sbbbbbbbbbbbs'],
 ['...r..x..b...','..rr..x..bb..','.rrr..x..bbb.','rrrr..x..bbbb','oooo..x..cccc','.ooo..x..ccc.','..oo..x..cc..','...o..x..c...'],
 ['rrooyyggccbbm','mrrooyyggccbb','bmrrooyyggccb','bbmrrooyyggcc','cbbmrrooyyggc','ccbbmrrooyygg','gccbbmrrooyyg','ggccbbmrrooyy'],
 ['...sss.sss...','..srrs.sbbs..','.srrrs.sbbbs.','srrrrs.sbbbbs','ssssss.ssssss','.............','ssssss.ssssss','sggggs.sccccs','.sgggs.scccs.'],
 ['xxxx.....xxxx','rrrs.....sbbb','ooos.....sccc','yyys.....sggg','sssss...sssss','.....mmm.....','....mmmmm....','...mmmmmmm...'],
 ['rrrrrrrrrrrrr','.ooooooo ooo.','..yyyyyyyyy..','...ggggggg...','....ccccc....','.....bbb.....','......m......','.....sss.....','....sssss....'],
 ['r..r..r..r..r','o..o..o..o..o','y..y..y..y..y','g..g..g..g..g','c..c..c..c..c','b..b..b..b..b','sxxsxxsxxsxxs','m..m..m..m..m'],
 ['....sssss....','...srrrrrs...','..srrooor rs..','.srooyyyoors.','sroyygggyyors','.srogcccgors.','..srobc bors..','...sromors...','....srsrs....'],
 ['xxxxxx.xxxxxx','rrrrrr.rrrrrr','oooooo.oooooo','ssssss.ssssss','yyyyyy.yyyyyy','gggggg.gggggg','ssssss.ssssss','cccccc.cccccc','bbbbbb.bbbbbb'],
 ['rrr..sss..bbb','ror..sys..bcb','rrr..sss..bbb','.............','ccc..sss..mmm','cgc..srs..mym','ccc..sss..mmm','.............','sssssssssssss'],
 ['...xx...xx...','..xssx.xssx..','.xsrrsxsbb sx.','xsroorsb cccsx','xsrooysbcgcsx','.xsrrsxsbb sx.','..xssx.xssx..','...ss...ss...'],
 ['rsssssssssssr','rsrrrrrrrrrsr','rsrooooooorsr','rsroyyyyyorsr','rsroygggyorsr','rsroygcgyorsr','rsroygbgyorsr','rsroygmgyorsr','rsroygwgyorsr'],
 ['sssssssssssss','srrrrrrrrrrrs','sooooooooooos','syyyyyyyyyyys','sgggggggggggs','scccccccccccs','sbbbbbbbbbbbs','smmmmmmmmmmms','sssssssssssss']
];
export function createLevel(index) {
  if(index===32) return [];
  return patterns[index % patterns.length].flatMap((raw,row)=>{
    const line=raw.replace(/ /g,'').padEnd(13,'.').slice(0,13);
    return [...line].flatMap((type,col)=>type==='.'?[]:[{
      x:32+col*32,y:94+row*18,w:31,h:16,type,
      hp:type==='x'?Infinity:type==='s'?2+Math.floor(index/8):1,
      maxHp:type==='x'?Infinity:type==='s'?2+Math.floor(index/8):1,
      alive:true,flash:0,...PALETTE[type]
    }]);
  });
}
export const BACKGROUNDS = [
  {base:'#092439',tile:'#123348',edge:'#1a4152',accent:'#64a5bd'},
  {base:'#182e21',tile:'#254332',edge:'#35543c',accent:'#91b078'},
  {base:'#272035',tile:'#342c44',edge:'#443751',accent:'#ac8ec0'},
  {base:'#302320',tile:'#43322b',edge:'#513e33',accent:'#c0906a'}
];

(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GOTOHomeStatsRuntime=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function hourFromKey(key){
    var parts=String(key||'').split('-');
    var hour=parseInt(parts[parts.length-1],10);
    return isFinite(hour)?hour:-1;
  }

  function numeric(value){
    var n=Number(value);
    return isFinite(n)&&n>0?n:0;
  }

  function hourlyTotal(entry){
    var hourly=entry&&entry.hourly&&typeof entry.hourly==='object'?entry.hourly:{};
    return Object.keys(hourly).reduce(function(sum,key){return sum+numeric(hourly[key]);},0);
  }

  function usageTotal(entry){
    if(!entry||typeof entry!=='object')return 0;
    return Math.max(
      numeric(entry.uses),
      numeric(entry.count),
      numeric(entry.total),
      numeric(entry.launches),
      hourlyTotal(entry)
    );
  }

  function cardState(activated,items){
    if(activated!==true)return {status:'dependency',items:[]};
    return items.length?{status:'ready',items:items}:{status:'null',items:[]};
  }

  function recent(stats,currentHour,limit){
    stats=stats&&typeof stats==='object'?stats:{};
    currentHour=Math.max(0,Math.min(23,parseInt(currentHour,10)||0));
    limit=Math.max(1,parseInt(limit,10)||6);
    // 最近卡片的固定口径：当前时段取 4 个，相邻时段取 1 个。
    // 这里的“时段”按小时处理，并跨历史日期聚合，避免页面刚打开时因当天样本太少而空卡。
    var currentCount=Math.min(4,limit);
    var adjacentCount=Math.min(1,Math.max(0,limit-currentCount));
    function rank(hour){
      var items=[];
      Object.keys(stats).forEach(function(id){
        var hourly=(stats[id]&&stats[id].hourly)||{};
        var count=0;
        Object.keys(hourly).forEach(function(key){
          if(hourFromKey(key)===hour)count+=numeric(hourly[key]);
        });
        if(count>0)items.push({id:id,c:count,h:hour});
      });
      items.sort(function(a,b){return b.c-a.c||String(a.id).localeCompare(String(b.id));});
      return items;
    }

    var allTime=Object.keys(stats).map(function(id){
      return {id:id,c:usageTotal(stats[id])};
    }).filter(function(item){return item.c>0;}).sort(function(a,b){
      return b.c-a.c||String(a.id).localeCompare(String(b.id));
    });
    var current=rank(currentHour).slice(0,currentCount);
    var used={};
    current.forEach(function(item){used[item.id]=true;});

    // 优先使用相邻时段；若相邻时段没有样本，按距离寻找最近的历史时段。
    // 这样首页不会因为当前小时或前一小时恰好没有启动记录而空白。
    var adjacent=[];
    for(var distance=1;distance<24&&adjacent.length<adjacentCount;distance++){
      var candidates=[(currentHour+24-distance)%24,(currentHour+distance)%24];
      for(var ci=0;ci<candidates.length&&adjacent.length<adjacentCount;ci++){
        rank(candidates[ci]).forEach(function(item){
          if(adjacent.length>=adjacentCount||used[item.id])return;
          used[item.id]=true;
          adjacent.push(item);
        });
      }
    }

    // 时段仍不足时，使用全时段排名补齐；这是真实统计回退，不制造演示数据。
    var fallback=allTime.filter(function(item){return !used[item.id];}).slice(0,Math.max(0,limit-current.length-adjacent.length));
    return current.concat(adjacent,fallback).slice(0,limit);
  }

  function frequent(stats,limit){
    stats=stats&&typeof stats==='object'?stats:{};
    limit=Math.max(1,parseInt(limit,10)||6);
    return Object.keys(stats).map(function(id){
      return {id:id,c:usageTotal(stats[id])};
    }).filter(function(item){return item.c>0;})
      .sort(function(a,b){return b.c-a.c||String(a.id).localeCompare(String(b.id));})
      .slice(0,limit);
  }

  return {hourFromKey:hourFromKey,cardState:cardState,recent:recent,frequent:frequent,usageTotal:usageTotal};
});

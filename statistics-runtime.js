(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GOTOStatisticsRuntime=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  var HOUR=60*60*1000;
  var DAY=24*HOUR;

  function finite(value,fallback){
    var number=Number(value);
    return isFinite(number)?number:(fallback||0);
  }

  function validTimestamp(value){
    var timestamp=finite(value,0);
    return timestamp>0?timestamp:0;
  }

  function normaliseLaunchEvents(events,now){
    var cutoff=now-DAY;
    return (Array.isArray(events)?events:[]).map(function(event){
      return {
        app:String(event&&event.app||''),
        ts:validTimestamp(event&&event.ts)
      };
    }).filter(function(event){
      return event.app&&event.ts>=cutoff&&event.ts<=now+60000;
    }).sort(function(a,b){return a.ts-b.ts;});
  }

  function normaliseSearchEvents(events,now){
    var cutoff=now-DAY;
    return (Array.isArray(events)?events:[]).map(function(event){
      return {
        ts:validTimestamp(event&&event.ts),
        length:Math.max(0,finite(event&&event.length,0))
      };
    }).filter(function(event){
      return event.ts>=cutoff&&event.ts<=now+60000;
    }).sort(function(a,b){return a.ts-b.ts;});
  }

  function allTimeRanking(stats){
    stats=stats&&typeof stats==='object'?stats:{};
    return Object.keys(stats).map(function(app){
      return {app:app,count:Math.max(0,finite(stats[app]&&stats[app].uses,0))};
    }).filter(function(item){return item.count>0;}).sort(function(a,b){
      return b.count-a.count||String(a.app).localeCompare(String(b.app));
    });
  }

  function buildTimeline(launchEvents,searchEvents,now){
    var currentStart=Math.floor(now/HOUR)*HOUR;
    var firstStart=currentStart-23*HOUR;
    var slots=[];
    for(var index=0;index<24;index++){
      var start=firstStart+index*HOUR;
      var date=new Date(start);
      slots.push({
        start:start,
        end:start+HOUR,
        hour:date.getHours(),
        label:String(date.getHours()).padStart(2,'0')+':00',
        searches:0,
        launches:0,
        apps:Object.create(null),
        top:[]
      });
    }
    launchEvents.forEach(function(event){
      var index=Math.floor((event.ts-firstStart)/HOUR);
      if(index<0||index>=slots.length)return;
      var slot=slots[index];
      slot.launches+=1;
      slot.apps[event.app]=(slot.apps[event.app]||0)+1;
    });
    searchEvents.forEach(function(event){
      var index=Math.floor((event.ts-firstStart)/HOUR);
      if(index>=0&&index<slots.length)slots[index].searches+=1;
    });
    slots.forEach(function(slot){
      slot.top=Object.keys(slot.apps).map(function(app){
        return {app:app,count:slot.apps[app]};
      }).sort(function(a,b){
        return b.count-a.count||String(a.app).localeCompare(String(b.app));
      }).slice(0,5);
      delete slot.apps;
    });
    return slots;
  }

  function aggregate(options){
    options=options||{};
    var now=validTimestamp(options.now)||Date.now();
    var activated=options.activated===true;
    var stats=options.stats&&typeof options.stats==='object'?options.stats:{};
    var ranking=allTimeRanking(stats);
    var totalLaunches=ranking.reduce(function(sum,item){return sum+item.count;},0);
    var launchEvents=normaliseLaunchEvents(options.launchEvents,now);
    var searchEvents=normaliseSearchEvents(options.searchEvents,now);
    var timeline=buildTimeline(launchEvents,searchEvents,now);
    var smartRanking=activated?buildSmartRanking(launchEvents,now):[];
    // 智能排名不能因为样本少于两个启动事件就整块空白：使用同一份统计
    // 快照中的全时段排名作为“当前统计”兜底，不制造演示数据，也不重复应用。
    if(activated && !smartRanking.length && ranking.length){
      smartRanking=[{
        start:now,
        end:now,
        startLabel:'当前统计',
        endLabel:'当前',
        startHour:new Date(now).getHours(),
        endHour:new Date(now).getHours(),
        durationMin:0,
        totalLaunches:totalLaunches,
        uniqueApps:ranking.length,
        top:ranking.slice(0,5).map(function(item){
          return {app:item.app,count:item.count};
        }),
        source:'all-time-fallback'
      }];
    }
    var totalSearches=Math.max(0,finite(options.totalSearches,0));
    var totalCharacters=Math.max(0,finite(options.totalCharacters,0));
    var shortcutCount=Math.max(0,finite(options.shortcutCount,0));
    if(!activated){
      totalLaunches=0;
      totalSearches=0;
      totalCharacters=0;
      shortcutCount=0;
      ranking=[];
      launchEvents=[];
      searchEvents=[];
      timeline=buildTimeline([],[],now);
    }
    var recentSearches=timeline.reduce(function(sum,slot){return sum+slot.searches;},0);
    var recentLaunches=timeline.reduce(function(sum,slot){return sum+slot.launches;},0);
    return {
      activated:activated,
      now:now,
      totalSearches:totalSearches,
      totalLaunches:totalLaunches,
      totalCharacters:totalCharacters,
      shortcutCount:shortcutCount,
      recentSearches:recentSearches,
      recentLaunches:recentLaunches,
      timeline:timeline,
      activeHours:timeline.filter(function(slot){return slot.launches>0;}),
      allTimeRanking:ranking,
      smartRanking:smartRanking,
      hasData:activated&&(totalSearches>0||totalLaunches>0||totalCharacters>0||shortcutCount>0)
    };
  }

  function pruneLaunchEvents(events,now){
    return normaliseLaunchEvents(events,validTimestamp(now)||Date.now());
  }

  function pruneSearchEvents(events,now){
    return normaliseSearchEvents(events,validTimestamp(now)||Date.now());
  }

  // ═══ 智能统计应用启动排名 ═══
  // 以 GOTO 启动事件为切分点，动态聚类时段
  // 时段区间可重叠（边界点同时属于前后两个时段）
  // 应用可出现在多个时段的 Top 5 中
  var SMART_MIN_GAP = 5 * 60 * 1000;   // 最小间隔 5 分钟（小于此间隔视为同一时段内的连续操作）
  var SMART_MAX_GAP = 6 * HOUR;        // 最大间隔 6 小时（超过此间隔截断，不形成时段）
  var SMART_TOP_N = 5;

  function buildSmartRanking(launchEvents, now){
    var events = normaliseLaunchEvents(launchEvents, validTimestamp(now) || Date.now());
    if(events.length < 2) return [];

    // 1. 提取 GOTO 启动时间点作为切分点（过滤掉过于密集的点）
    var cutPoints = [];
    for(var i = 0; i < events.length; i++){
      var ts = events[i].ts;
      if(cutPoints.length === 0 || ts - cutPoints[cutPoints.length - 1] >= SMART_MIN_GAP){
        cutPoints.push(ts);
      }
    }

    // 2. 构建时段：相邻切分点形成一个时段，允许边界重叠
    var segments = [];
    for(var j = 0; j < cutPoints.length - 1; j++){
      var start = cutPoints[j];
      var end = cutPoints[j + 1];
      if(end - start > SMART_MAX_GAP) continue;  // 间隔过大，跳过

      // 收集该时段内的所有启动事件（包含边界点）
      var appsInSegment = Object.create(null);
      var totalInSegment = 0;
      for(var k = 0; k < events.length; k++){
        var e = events[k];
        if(e.ts >= start && e.ts <= end){
          appsInSegment[e.app] = (appsInSegment[e.app] || 0) + 1;
          totalInSegment++;
        }
      }

      if(totalInSegment === 0) continue;

      // 排序取 Top N
      var top = Object.keys(appsInSegment).map(function(app){
        return { app: app, count: appsInSegment[app] };
      }).sort(function(a, b){
        return b.count - a.count || String(a.app).localeCompare(String(b.app));
      }).slice(0, SMART_TOP_N);

      var startDate = new Date(start);
      var endDate = new Date(end);
      segments.push({
        start: start,
        end: end,
        startLabel: String(startDate.getHours()).padStart(2, '0') + ':' + String(startDate.getMinutes()).padStart(2, '0'),
        endLabel: String(endDate.getHours()).padStart(2, '0') + ':' + String(endDate.getMinutes()).padStart(2, '0'),
        startHour: startDate.getHours(),
        endHour: endDate.getHours(),
        durationMin: Math.round((end - start) / 60000),
        totalLaunches: totalInSegment,
        uniqueApps: Object.keys(appsInSegment).length,
        top: top
      });
    }

    return segments;
  }

  return {
    HOUR:HOUR,
    DAY:DAY,
    aggregate:aggregate,
    allTimeRanking:allTimeRanking,
    buildTimeline:buildTimeline,
    buildSmartRanking:buildSmartRanking,
    pruneLaunchEvents:pruneLaunchEvents,
    pruneSearchEvents:pruneSearchEvents
  };
});

(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GOTOSearchRuntime=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  function number(value,fallback){
    value=Number(value);
    return Number.isFinite(value)?value:fallback;
  }

  function computeHacParams(input){
    input=input||{};
    var samples=(input.samples||[]).map(function(item){
      return number(typeof item==='number'?item:item&&item.interval,0);
    }).filter(function(value){return value>0;}).slice(-5);
    var previousPmax=(input.pmaxSeq||[]).map(function(value){return number(value,0);}).filter(function(value){return value>0;}).slice(-2);
    if(samples.length<5){
      return {t1:200,t2:200,tavg:200,sigma:0,pmax:200,errorRate:0,pmaxSeq:previousPmax};
    }

    var avg=samples.reduce(function(sum,value){return sum+value;},0)/samples.length;
    var variance=samples.reduce(function(sum,value){var delta=value-avg;return sum+delta*delta;},0)/samples.length;
    var sigma=Math.sqrt(variance);
    var fastest=Math.min.apply(null,samples);
    var pmaxSeq=previousPmax.concat([fastest]).slice(-3);
    var pmaxAvg=pmaxSeq.reduce(function(sum,value){return sum+value;},0)/pmaxSeq.length;
    var errorRate=Math.min(0.5,number(input.backspaceCount,0)/Math.max(1,number(input.totalKeystrokes,0)));

    // PRD: T1 = clamp(pmax × (1+E), Tavg×2, 400ms).
    // 当动态下限本身高于 400ms 时仍以安全上限 400ms 为准。
    var t1=Math.min(400,Math.max(Math.min(avg*2,400),pmaxAvg*(1+errorRate)));
    var t2=Math.max(30,Math.min(avg*1.5,avg+sigma));
    return {
      t1:Math.round(t1),t2:Math.round(t2),tavg:Math.round(avg),sigma:Math.round(sigma),
      pmax:Math.round(pmaxAvg),errorRate:Math.round(errorRate*100),pmaxSeq:pmaxSeq
    };
  }

  function acceptHacInterval(samples,interval){
    var list=(samples||[]).map(function(item){
      return {interval:number(typeof item==='number'?item:item&&item.interval,0),ts:item&&item.ts||0};
    }).filter(function(item){return item.interval>0;}).slice(-5);
    interval=number(interval,0);
    if(interval<=10||interval>=3000)return {accepted:false,samples:list};
    if(list.length>=2){
      var avg=list.reduce(function(sum,item){return sum+item.interval;},0)/list.length;
      if(avg>0&&Math.abs(interval-avg)/avg>0.5)return {accepted:false,samples:list};
    }
    list.push({interval:interval,ts:Date.now()});
    return {accepted:true,samples:list.slice(-5)};
  }

  return {computeHacParams:computeHacParams,acceptHacInterval:acceptHacInterval};
});

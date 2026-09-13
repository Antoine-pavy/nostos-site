const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
function backend(name,{session={id:'cs_test_abc',payment_status:'paid',amount_total:1900,currency:'eur'},price={active:true,currency:'eur',unit_amount:1900,type:'one_time'},eventType='checkout.session.completed',kitStatus=200,badSignature=false}={}) {
 const calls=[];
 class Stripe {constructor(){this.checkout={sessions:{retrieve:async()=>session,create:async payload=>{calls.push(payload);return{id:'cs_test_abc',url:'https://checkout.stripe.com/example'};}}};this.prices={retrieve:async()=>price};this.webhooks={constructEvent:()=>{if(badSignature)throw Error('signature');return{type:eventType,data:{object:session}};}};}}
 const context={exports:{},require:()=>Stripe,process:{env:{STRIPE_SECRET_KEY:'test',STRIPE_PRICE_ID:'price_test',STRIPE_WEBHOOK_SECRET:'test',KIT_API_KEY:'test',KIT_TAG_ID:'1',SITE_URL:'https://nostosprogram.com'}},Buffer,console:{log(){},error(){}},fetch:async()=>({status:kitStatus,ok:kitStatus===200,text:async()=>kitStatus===200?'{}':'{"error":"unavailable"}'})};
 vm.runInNewContext(fs.readFileSync(path.join(root,'netlify/functions',name+'.js'),'utf8'),context);return{handler:context.exports.handler,calls};
}
test('verification refuses missing and unpaid sessions; paid response has no personal data',async()=>{
 let api=backend('verify-checkout-session');assert.equal((await api.handler({httpMethod:'GET',queryStringParameters:{}})).statusCode,400);
 api=backend('verify-checkout-session',{session:{payment_status:'unpaid'}});assert.equal((await api.handler({httpMethod:'GET',queryStringParameters:{session_id:'cs_test_abc'}})).statusCode,403);
 api=backend('verify-checkout-session');let result=JSON.parse((await api.handler({httpMethod:'GET',queryStringParameters:{session_id:'cs_test_abc'}})).body);assert.equal(result.amount_total,19);assert.equal(result.currency,'EUR');assert.equal('email' in result,false);
});
test('checkout blocks incorrect configured price and preserves success/cancel routes',async()=>{
 const request={httpMethod:'POST',body:JSON.stringify({email:'test@example.com',full_name:'Test'})};
 let api=backend('create-checkout-session',{price:{active:true,currency:'eur',unit_amount:3900,type:'one_time'}});assert.equal((await api.handler(request)).statusCode,503);assert.equal(api.calls.length,0);
 api=backend('create-checkout-session');assert.equal((await api.handler(request)).statusCode,200);assert.equal(api.calls[0].success_url,'https://nostosprogram.com/merci?session_id={CHECKOUT_SESSION_ID}');
});
test('webhook only delivers paid orders and returns a retryable error on Kit failure',async()=>{
 const request={httpMethod:'POST',headers:{'stripe-signature':'test'},body:'{}'};
 for(const [options,status] of [[{badSignature:true},400],[{session:{payment_status:'unpaid'}},200],[{session:{payment_status:'paid',customer_email:'test@example.com'},kitStatus:503},503],[{session:{payment_status:'paid',customer_email:'test@example.com'},eventType:'checkout.session.async_payment_succeeded'},200]]){
  assert.equal((await backend('stripe-webhook',options).handler(request)).statusCode,status);
 }
});
function tracking(host='nostosprogram.com',choice=true,environment='production') {
 const saved=new Map(choice===null?[]:[['nostos_v2_consent',JSON.stringify({marketing:choice,timestamp:new Date().toISOString()})]]),scripts=[],handlers={},events=[];
 const buttons={yes:{addEventListener:(k,f)=>handlers.yes=f},no:{addEventListener:(k,f)=>handlers.no=f}};
 const panel={setAttribute(){},querySelector:q=>q.includes('yes')?buttons.yes:buttons.no};
 const link={textContent:'Commencer',id:'buy',addEventListener:(k,f)=>handlers.buy=f};
 const document={readyState:'complete',head:{appendChild:e=>scripts.push(e.src)},body:{appendChild(){}},documentElement:{classList:{add(){},remove(){}}},querySelector:q=>q.startsWith('meta')?{getAttribute:()=>environment}:null,querySelectorAll:q=>q.startsWith('a[')?[link]:[],createElement:t=>t==='section'?panel:{}};
 const ctx={document,location:{hostname:host,protocol:'https:',reload(){}},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},setTimeout:f=>f(),requestIdleCallback:f=>f(),Date,Set,JSON,Number};ctx.window=ctx;ctx.fbq=(...a)=>events.push(a);ctx.addEventListener=()=>{};vm.runInNewContext(fs.readFileSync(path.join(root,'tracking.js'),'utf8'),ctx);return{ctx,scripts,events,handlers};
}
test('production analytics: consent gate, correct ids, single PageView and checkout at 19 EUR',()=>{
 const r=tracking(undefined,false);assert.equal(r.scripts.length,0);r.handlers.yes();assert.equal(r.scripts.length,3);r.handlers.buy();assert.equal(r.events.filter(e=>e[1]==='PageView').length,1);assert.equal(r.events.find(e=>e[1]==='InitiateCheckout')[2].value,19);
});
test('localhost and branch/deploy previews never send production events',()=>{
 for(const [host,env] of [['127.0.0.1','production'],['deploy-preview-1--nostos.netlify.app','preview'],['nostosprogram.com','preview']]) {const r=tracking(host,true,env);r.handlers.buy();assert.equal(r.scripts.length,0);assert.equal(r.events.length,0);}
});
test('purchase after delayed consent is deduplicated with matching Meta and GA4 transaction ids',()=>{
 const r=tracking(undefined,null);const order={id:'cs_test_abc',value:19,currency:'EUR'};r.ctx.nostosTracking.verifiedPurchase(order);assert.equal(r.events.length,0);r.handlers.yes();r.ctx.nostosTracking.verifiedPurchase(order);const purchases=r.events.filter(e=>e[1]==='Purchase');assert.equal(purchases.length,1);assert.equal(purchases[0][3].eventID,order.id);assert(r.scripts.some(s=>s.includes('G-KRLJ69613G')));
 const ga=r.ctx.dataLayer.map(e=>Array.from(e)).find(e=>e[0]==='event'&&e[1]==='purchase');assert.equal(ga[2].transaction_id,order.id);assert.equal(ga[2].send_to,'G-KRLJ69613G');
});
test('confirmation never invents a purchase on missing, failed or malformed backend response',async()=>{
 for(const [search,ok,body,expected] of [['',true,{},0],['?session_id=cs_test_abc',false,{},0],['?session_id=cs_test_abc',true,{ok:true,id:'cs_test_other',amount_total:19,currency:'EUR'},0],['?session_id=cs_test_abc',true,{ok:true,id:'cs_test_abc',amount_total:19,currency:'EUR'},1]]){
  const nodes={},purchases=[];const ctx={URLSearchParams,Number,location:{search},document:{getElementById:id=>nodes[id]||=( {textContent:'',classList:{add(){},remove(){}}})},fetch:async()=>({ok,json:async()=>body}),window:{nostosTracking:{verifiedPurchase:o=>purchases.push(o)}}};vm.runInNewContext(fs.readFileSync(path.join(root,'purchase.js'),'utf8'),ctx);await new Promise(setImmediate);assert.equal(purchases.length,expected);
 }
});

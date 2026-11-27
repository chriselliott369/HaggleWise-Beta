/* Beta 28: account-scoped snapshots, atomic writes, explicit conflicts. */
window.hwCloud=(()=>{
 const keys=['holidayV6','holidayRatesV5','turkeyLastLiveRefreshV4','hagglewise121','hagglewise122trips','hagglewise122manual','holidayV5'];
 let uid=null,busy=false,timer,ready=false,blocked=false;
 const prefix=()=> 'hw-b6-user:'+uid+':';
 const meta=()=>prefix()+'cloud-base-v1';
 const snap=()=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(prefix()+k)]));
 const equal=(a,b)=>!!a&&!!b&&keys.every(k=>(a[k]??null)===(b[k]??null));
 const valid=d=>window.hwDataValid.snapshot(d);
 const base=()=>{try{return JSON.parse(localStorage.getItem(meta())||'null')}catch{return null}};
 const remember=d=>localStorage.setItem(meta(),JSON.stringify(d));
 let currentStatus='Checking cloud backup…',lastAlert='';
 const lastKey=()=>prefix()+'cloud-last-success-v1';
 function render(){const e=document.getElementById('hw-cloud-status'),l=document.getElementById('hw-cloud-last'),b=document.getElementById('hw-sync-now');if(!e||!uid)return;e.textContent=currentStatus;const error=/Conflict|missing|Sync pending/.test(currentStatus);e.dataset.kind=error?'error':/up to date|saved$|restored|backed up/.test(currentStatus)?'ok':'normal';const stamp=localStorage.getItem(lastKey());l.textContent='Last successful sync: '+(stamp?new Date(stamp).toLocaleString():'Not yet recorded');b.disabled=busy||!navigator.onLine;if(ready&&error&&lastAlert!==currentStatus){lastAlert=currentStatus;const n=document.createElement('div');n.className='hw-toast';n.setAttribute('role','alert');n.textContent='Cloud sync needs attention. Open More.';document.body.append(n);setTimeout(()=>n.remove(),4500)}if(!error)lastAlert=''}
 const status=t=>{currentStatus=t;if(/^(Cloud up to date|Cloud backup saved|Cloud data restored|Device version backed up)$/.test(t))localStorage.setItem(lastKey(),new Date().toISOString());render()};
 const read=async()=>{const rows=await hwAuth.cloudRequest('hagglewise_user_data?select=data&user_id=eq.'+encodeURIComponent(uid),undefined,uid);if(!Array.isArray(rows)||rows.length>1)throw Error('Unexpected cloud response');const d=rows.length?rows[0].data:null;if(d!==null&&!valid(d))throw Error('Unsupported cloud data');return d};
 const write=(expected,replacement)=>hwAuth.cloudRequest('rpc/hagglewise_sync',{expected,replacement},uid);
 function restore(d){if(hwAuth.storedUserId()!==uid)throw Error('Account changed');const old=snap();localStorage.setItem(prefix()+'cloud-restore-backup',JSON.stringify(old));for(const k of keys){if(d[k]==null)localStorage.removeItem(prefix()+k);else localStorage.setItem(prefix()+k,d[k])}remember(d)}
 async function sync(manual=false,boot=false){if(!uid||busy||hwAuth.storedUserId()!==uid)return;if(!navigator.onLine){status('Offline · changes saved on this device');return}busy=true;status('Synchronising…');try{const local=snap(),prior=base(),remote=await read();if(!valid(local))throw Error("Invalid local data; backup retained");if(hwAuth.storedUserId()!==uid||!equal(local,snap())){status('Changes pending · retrying');return}if(remote&&equal(local,remote)){remember(remote);blocked=false;status('Cloud up to date');return}if(remote===null){if(prior){blocked=true;status('Cloud copy missing · local data kept');if(!manual||!confirm('Cloud copy is missing. Upload this device’s saved data?'))return}if(!Object.values(local).some(v=>v!==null))return;if(await write(null,local)!==true)throw Error('Cloud changed; retry');remember(local);blocked=false;status('Cloud backup saved');return}
 if((prior&&equal(local,prior))||(!prior&&Object.values(local).every(v=>v===null))){restore(remote);blocked=false;status('Cloud data restored');if(!boot)location.reload();return}
 if(prior&&equal(remote,prior)){if(await write(remote,local)!==true)throw Error('Cloud changed; retry');remember(local);blocked=false;status('Cloud backup saved');return}
 blocked=true;status('Conflict · both copies kept. Tap Sync now.');if(!manual)return;
 if(confirm('Different data exists on this device and in the cloud. Keep THIS DEVICE version and replace the cloud copy?')){if(!equal(local,snap()))throw Error('Local data changed; retry');if(await write(remote,local)!==true)throw Error('Cloud changed; retry');remember(local);blocked=false;status('Device version backed up');}
 else if(confirm('Restore the CLOUD version instead? This replaces local data; a recovery copy is retained on this device.')){if(!equal(local,snap()))throw Error('Local data changed; retry');restore(remote);blocked=false;location.reload()}
 }catch(e){status('Sync pending · '+e.message+' Local data kept.')}finally{busy=false;render()}}
 function schedule(){if(!ready||!uid||blocked)return;clearTimeout(timer);if(!busy)status(navigator.onLine?'Changes pending · waiting to sync':'Offline · changes saved on this device');timer=setTimeout(()=>sync(),2500)}
 return {async init(user){if(!user||hwAuth.isRecovery())return;uid=user.id;await sync(false,true)},start(){if(!uid)return;ready=true;const b=document.getElementById('hw-cloud');b.hidden=false;document.getElementById('hw-sync-now').onclick=()=>sync(true);if(blocked)status('Conflict · both copies kept. Tap Sync now.');else if(!navigator.onLine)status('Offline · saved on this device');else render();schedule();window.addEventListener('online',()=>sync());window.addEventListener('offline',()=>status('Offline · saved on this device'));setInterval(()=>{if(!blocked&&document.visibilityState==='visible')sync()},60000)},changed:schedule};
})();

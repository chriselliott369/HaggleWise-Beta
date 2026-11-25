/* HaggleWise Beta 9: public publishable key only, no server secrets. */
(()=>{'use strict';
const URL='https://rpuzdciyumerclklkffw.supabase.co';
const KEY='sb_publishable_7ZaECXi_ziM6KBt6uARowQ_2JXIP20E';
const STORE='hw-beta6-auth-session';
const CONFIRMED='hw-beta-confirmation-pending';
const redirect=location.origin+location.pathname;
let error='';
function session(){try{return JSON.parse(localStorage.getItem(STORE)||'null')}catch{return null}}
function save(s){if(s?.access_token&&s?.refresh_token)localStorage.setItem(STORE,JSON.stringify(s))}
function clear(){localStorage.removeItem(STORE)}
async function request(path,method='GET',body,token){const r=await fetch(URL+'/auth/v1/'+path,{method,headers:{apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json().catch(()=>({}));if(!r.ok){if(path.startsWith('token?grant_type=password')&&(r.status===400||r.status===401))throw Error('Email or password not recognised. Please try again or create an account.');throw Error(data.msg||data.error_description||data.message||data.error||'Authentication failed. Please try again.')}return data}
async function finish(s){save(s);location.replace(redirect)}
async function callback(){const hash=new URLSearchParams(location.hash.slice(1));const query=new URLSearchParams(location.search);if(hash.get('error')||query.get('error')){sessionStorage.removeItem('hw-google-return');sessionStorage.removeItem(CONFIRMED);error=hash.get('error_description')||query.get('error_description')||'Sign-in was cancelled';history.replaceState(null,'',redirect);return}
if(hash.get('access_token')&&hash.get('refresh_token')){if(hash.get('type')==='signup')sessionStorage.setItem(CONFIRMED,'1');save({access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token'),expires_at:Math.floor(Date.now()/1000)+Number(hash.get('expires_in')||3600)});history.replaceState(null,'',redirect);if(hash.get('provider_token')||sessionStorage.getItem('hw-google-return')==='1'){sessionStorage.removeItem('hw-google-return');location.replace(redirect);await new Promise(()=>{})}}
else if(query.get('code')){try{if(query.get('type')==='signup')sessionStorage.setItem(CONFIRMED,'1');const s=await request('token?grant_type=pkce','POST',{auth_code:query.get('code'),code_verifier:sessionStorage.getItem('hw-pkce-verifier')});save(s)}catch(e){sessionStorage.removeItem(CONFIRMED);error=e.message}history.replaceState(null,'',redirect);if(!error&&sessionStorage.getItem('hw-google-return')==='1'){sessionStorage.removeItem('hw-google-return');location.replace(redirect);await new Promise(()=>{})}}
}
const callbackPromise=callback();
// Beta 16: only a previously server-verified account may reopen offline.
// Never use an unverified token or a guest session as an offline login.
async function verifySession(){
 await callbackPromise;
 let s=session();
 if(!s)return null;
 if(!navigator.onLine){
   if(s.user_id && s.verified_email){
     return {id:s.user_id,email:s.verified_email,offline:true};
   }
   throw Error('Connect to the internet once to verify your account before using it offline.');
 }
 try{
   if(s.expires_at && s.expires_at<Math.floor(Date.now()/1000)+90){
     const refreshed=await request('token?grant_type=refresh_token','POST',{refresh_token:s.refresh_token});
     s={...s,...refreshed,expires_at:Math.floor(Date.now()/1000)+Number(refreshed.expires_in||3600)};
     save(s);
   }
   const user=await request('user','GET',null,s.access_token);
   if(!user.id)throw Error('Account could not be verified');
   if(s.user_id && s.user_id!==user.id){
     clear();
     throw Error('Account changed. Please sign in again.');
   }
   s.user_id=user.id;
   s.verified_email=user.email||s.verified_email||'';
   save(s);
   return user;
 }catch(e){
   // Connectivity failures must not erase a verified user's local session.
   if(s.user_id && s.verified_email && (e instanceof TypeError || !navigator.onLine)){
     return {id:s.user_id,email:s.verified_email,offline:true};
   }
   // Keep the local data even if an expired session needs a fresh login.
   if(/invalid refresh token|refresh token not found|session expired|jwt expired/i.test(e.message||'')){
     clear();
     throw Error('Session expired. Please sign in again when online.');
   }
   throw e;
 }
}
function validEmail(email){if(!email?.trim()||!email.includes('@'))throw Error('Enter a valid email address.');return email.trim()}
function validPassword(p){if(!p||p.length<6)throw Error('Password must be at least 6 characters.')}
window.hwAuth={
 takeConfirmedSignup(){if(sessionStorage.getItem(CONFIRMED)==='1'){sessionStorage.removeItem(CONFIRMED);return true}return false},
 storedUserId(){return session()?.user_id||null},hasCallbackError(){return !!error},callbackError(){return error},verifySession,
 async emailLogin(email,password){if(!navigator.onLine)throw Error('Email sign-in requires an internet connection.');email=validEmail(email);validPassword(password);const s=await request('token?grant_type=password','POST',{email,password});await finish(s);return 'Signing in…'},
 async emailSignup(email,password){if(!navigator.onLine)throw Error('Creating an account requires an internet connection.');email=validEmail(email);validPassword(password);const s=await request('signup?redirect_to='+encodeURIComponent(redirect),'POST',{email,password});if(s.access_token)await finish(s);return 'Check your email to confirm your HaggleWise account. Open the confirmation message and tap the link. If it is not in your inbox, check your junk folder.'},
 async googleLogin(){if(!navigator.onLine)throw Error('Google sign-in requires an internet connection.');sessionStorage.setItem('hw-google-return','1');location.href=URL+'/auth/v1/authorize?provider=google&redirect_to='+encodeURIComponent(redirect);return 'Opening Google…'},
 async microsoftLogin(){if(!navigator.onLine)throw Error('Microsoft sign-in requires an internet connection.');sessionStorage.setItem('hw-google-return','1');location.href=URL+'/auth/v1/authorize?provider=azure&scopes=email&redirect_to='+encodeURIComponent(redirect);return 'Opening Microsoft…'},
 async resetPassword(email){if(!navigator.onLine)throw Error('Password reset requires an internet connection.');email=validEmail(email);await request('recover','POST',{email,gotrue:true});return 'If this email has an account, check your inbox for recovery instructions.'},
 async signOut(){const s=session();clear();if(s?.access_token&&navigator.onLine)try{await request('logout','POST',{},s.access_token)}catch(e){} }
};
})();

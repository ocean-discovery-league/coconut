function g(){}const ht=t=>t;function J(t,e){for(const n in e)t[n]=e[n];return t}function P(t){return t()}function q(){return Object.create(null)}function x(t){t.forEach(P)}function L(t){return typeof t=="function"}function mt(t,e){return t!=t?e==e:t!==e||t&&typeof t=="object"||typeof t=="function"}let w;function pt(t,e){return w||(w=document.createElement("a")),w.href=e,t===w.href}function K(t){return Object.keys(t).length===0}function Q(t,...e){if(t==null)return g;const n=t.subscribe(...e);return n.unsubscribe?()=>n.unsubscribe():n}function yt(t,e,n){t.$$.on_destroy.push(Q(e,n))}function gt(t,e,n,i){if(t){const r=O(t,e,n,i);return t[0](r)}}function O(t,e,n,i){return t[1]&&i?J(n.ctx.slice(),t[1](i(e))):n.ctx}function bt(t,e,n,i){if(t[2]&&i){const r=t[2](i(n));if(e.dirty===void 0)return r;if(typeof r=="object"){const s=[],o=Math.max(e.dirty.length,r.length);for(let l=0;l<o;l+=1)s[l]=e.dirty[l]|r[l];return s}return e.dirty|r}return e.dirty}function xt(t,e,n,i,r,s){if(r){const o=O(e,n,i,s);t.p(o,r)}}function $t(t){if(t.ctx.length>32){const e=[],n=t.ctx.length/32;for(let i=0;i<n;i++)e[i]=-1;return e}return-1}const z=typeof window<"u";let wt=z?()=>window.performance.now():()=>Date.now(),B=z?t=>requestAnimationFrame(t):g;const m=new Set;function H(t){m.forEach(e=>{e.c(t)||(m.delete(e),e.f())}),m.size!==0&&B(H)}function vt(t){let e;return m.size===0&&B(H),{promise:new Promise(n=>{m.add(e={c:t,f:n})}),abort(){m.delete(e)}}}let E=!1;function U(){E=!0}function V(){E=!1}function X(t,e,n,i){for(;t<e;){const r=t+(e-t>>1);n(r)<=i?t=r+1:e=r}return t}function Y(t){if(t.hydrate_init)return;t.hydrate_init=!0;let e=t.childNodes;if(t.nodeName==="HEAD"){const c=[];for(let u=0;u<e.length;u++){const f=e[u];f.claim_order!==void 0&&c.push(f)}e=c}const n=new Int32Array(e.length+1),i=new Int32Array(e.length);n[0]=-1;let r=0;for(let c=0;c<e.length;c++){const u=e[c].claim_order,f=(r>0&&e[n[r]].claim_order<=u?r+1:X(1,r,$=>e[n[$]].claim_order,u))-1;i[c]=n[f]+1;const a=f+1;n[a]=c,r=Math.max(a,r)}const s=[],o=[];let l=e.length-1;for(let c=n[r]+1;c!=0;c=i[c-1]){for(s.push(e[c-1]);l>=c;l--)o.push(e[l]);l--}for(;l>=0;l--)o.push(e[l]);s.reverse(),o.sort((c,u)=>c.claim_order-u.claim_order);for(let c=0,u=0;c<o.length;c++){for(;u<s.length&&o[c].claim_order>=s[u].claim_order;)u++;const f=u<s.length?s[u]:null;t.insertBefore(o[c],f)}}function Z(t,e){if(E){for(Y(t),(t.actual_end_child===void 0||t.actual_end_child!==null&&t.actual_end_child.parentNode!==t)&&(t.actual_end_child=t.firstChild);t.actual_end_child!==null&&t.actual_end_child.claim_order===void 0;)t.actual_end_child=t.actual_end_child.nextSibling;e!==t.actual_end_child?(e.claim_order!==void 0||e.parentNode!==t)&&t.insertBefore(e,t.actual_end_child):t.actual_end_child=e.nextSibling}else(e.parentNode!==t||e.nextSibling!==null)&&t.appendChild(e)}function Et(t,e,n){E&&!n?Z(t,e):(e.parentNode!==t||e.nextSibling!=n)&&t.insertBefore(e,n||null)}function tt(t){t.parentNode&&t.parentNode.removeChild(t)}function kt(t,e){for(let n=0;n<t.length;n+=1)t[n]&&t[n].d(e)}function et(t){return document.createElement(t)}function nt(t){return document.createElementNS("http://www.w3.org/2000/svg",t)}function C(t){return document.createTextNode(t)}function Nt(){return C(" ")}function St(){return C("")}function At(t,e,n,i){return t.addEventListener(e,n,i),()=>t.removeEventListener(e,n,i)}function jt(t){return function(e){return e.preventDefault(),t.call(this,e)}}function Ct(t,e,n){n==null?t.removeAttribute(e):t.getAttribute(e)!==n&&t.setAttribute(e,n)}function it(t){return Array.from(t.childNodes)}function rt(t){t.claim_info===void 0&&(t.claim_info={last_index:0,total_claimed:0})}function F(t,e,n,i,r=!1){rt(t);const s=(()=>{for(let o=t.claim_info.last_index;o<t.length;o++){const l=t[o];if(e(l)){const c=n(l);return c===void 0?t.splice(o,1):t[o]=c,r||(t.claim_info.last_index=o),l}}for(let o=t.claim_info.last_index-1;o>=0;o--){const l=t[o];if(e(l)){const c=n(l);return c===void 0?t.splice(o,1):t[o]=c,r?c===void 0&&t.claim_info.last_index--:t.claim_info.last_index=o,l}}return i()})();return s.claim_order=t.claim_info.total_claimed,t.claim_info.total_claimed+=1,s}function I(t,e,n,i){return F(t,r=>r.nodeName===e,r=>{const s=[];for(let o=0;o<r.attributes.length;o++){const l=r.attributes[o];n[l.name]||s.push(l.name)}s.forEach(o=>r.removeAttribute(o))},()=>i(e))}function Dt(t,e,n){return I(t,e,n,et)}function Tt(t,e,n){return I(t,e,n,nt)}function ot(t,e){return F(t,n=>n.nodeType===3,n=>{const i=""+e;if(n.data.startsWith(i)){if(n.data.length!==i.length)return n.splitText(i.length)}else n.data=i},()=>C(e),!0)}function qt(t){return ot(t," ")}function Mt(t,e){e=""+e,t.data!==e&&(t.data=e)}function Pt(t,e){t.value=e??""}function Lt(t,e,n,i){n===null?t.style.removeProperty(e):t.style.setProperty(e,n,i?"important":"")}function Ot(t,e,n){for(let i=0;i<t.options.length;i+=1){const r=t.options[i];if(r.__value===e){r.selected=!0;return}}(!n||e!==void 0)&&(t.selectedIndex=-1)}function zt(t){const e=t.querySelector(":checked");return e&&e.__value}function Bt(t,e,n){t.classList[n?"add":"remove"](e)}function ct(t,e,{bubbles:n=!1,cancelable:i=!1}={}){const r=document.createEvent("CustomEvent");return r.initCustomEvent(t,n,i,e),r}function Ht(t,e){const n=[];let i=0;for(const r of e.childNodes)if(r.nodeType===8){const s=r.textContent.trim();s===`HEAD_${t}_END`?(i-=1,n.push(r)):s===`HEAD_${t}_START`&&(i+=1,n.push(r))}else i>0&&n.push(r);return n}function Ft(t,e){return new t(e)}let b;function y(t){b=t}function k(){if(!b)throw new Error("Function called outside component initialization");return b}function It(t){k().$$.on_mount.push(t)}function Rt(t){k().$$.after_update.push(t)}function Wt(t){k().$$.on_destroy.push(t)}function Gt(){const t=k();return(e,n,{cancelable:i=!1}={})=>{const r=t.$$.callbacks[e];if(r){const s=ct(e,n,{cancelable:i});return r.slice().forEach(o=>{o.call(t,s)}),!s.defaultPrevented}return!0}}function Jt(t,e){const n=t.$$.callbacks[e.type];n&&n.slice().forEach(i=>i.call(this,e))}const h=[],M=[];let p=[];const S=[],R=Promise.resolve();let A=!1;function W(){A||(A=!0,R.then(G))}function Kt(){return W(),R}function j(t){p.push(t)}function Qt(t){S.push(t)}const N=new Set;let _=0;function G(){if(_!==0)return;const t=b;do{try{for(;_<h.length;){const e=h[_];_++,y(e),st(e.$$)}}catch(e){throw h.length=0,_=0,e}for(y(null),h.length=0,_=0;M.length;)M.pop()();for(let e=0;e<p.length;e+=1){const n=p[e];N.has(n)||(N.add(n),n())}p.length=0}while(h.length);for(;S.length;)S.pop()();A=!1,N.clear(),y(t)}function st(t){if(t.fragment!==null){t.update(),x(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(j)}}function lt(t){const e=[],n=[];p.forEach(i=>t.indexOf(i)===-1?e.push(i):n.push(i)),n.forEach(i=>i()),p=e}const v=new Set;let d;function Ut(){d={r:0,c:[],p:d}}function Vt(){d.r||x(d.c),d=d.p}function ut(t,e){t&&t.i&&(v.delete(t),t.i(e))}function Xt(t,e,n,i){if(t&&t.o){if(v.has(t))return;v.add(t),d.c.push(()=>{v.delete(t),i&&(n&&t.d(1),i())}),t.o(e)}else i&&i()}const Yt=typeof window<"u"?window:typeof globalThis<"u"?globalThis:global;function Zt(t,e){const n={},i={},r={$$scope:1};let s=t.length;for(;s--;){const o=t[s],l=e[s];if(l){for(const c in o)c in l||(i[c]=1);for(const c in l)r[c]||(n[c]=l[c],r[c]=1);t[s]=l}else for(const c in o)r[c]=1}for(const o in i)o in n||(n[o]=void 0);return n}function te(t){return typeof t=="object"&&t!==null?t:{}}const at=["allowfullscreen","allowpaymentrequest","async","autofocus","autoplay","checked","controls","default","defer","disabled","formnovalidate","hidden","inert","ismap","loop","multiple","muted","nomodule","novalidate","open","playsinline","readonly","required","reversed","selected"];[...at];function ee(t,e,n){const i=t.$$.props[e];i!==void 0&&(t.$$.bound[i]=n,n(t.$$.ctx[i]))}function ne(t){t&&t.c()}function ie(t,e){t&&t.l(e)}function ft(t,e,n,i){const{fragment:r,after_update:s}=t.$$;r&&r.m(e,n),i||j(()=>{const o=t.$$.on_mount.map(P).filter(L);t.$$.on_destroy?t.$$.on_destroy.push(...o):x(o),t.$$.on_mount=[]}),s.forEach(j)}function dt(t,e){const n=t.$$;n.fragment!==null&&(lt(n.after_update),x(n.on_destroy),n.fragment&&n.fragment.d(e),n.on_destroy=n.fragment=null,n.ctx=[])}function _t(t,e){t.$$.dirty[0]===-1&&(h.push(t),W(),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}function re(t,e,n,i,r,s,o,l=[-1]){const c=b;y(t);const u=t.$$={fragment:null,ctx:[],props:s,update:g,not_equal:r,bound:q(),on_mount:[],on_destroy:[],on_disconnect:[],before_update:[],after_update:[],context:new Map(e.context||(c?c.$$.context:[])),callbacks:q(),dirty:l,skip_bound:!1,root:e.target||c.$$.root};o&&o(u.root);let f=!1;if(u.ctx=n?n(t,e.props||{},(a,$,...D)=>{const T=D.length?D[0]:$;return u.ctx&&r(u.ctx[a],u.ctx[a]=T)&&(!u.skip_bound&&u.bound[a]&&u.bound[a](T),f&&_t(t,a)),$}):[],u.update(),f=!0,x(u.before_update),u.fragment=i?i(u.ctx):!1,e.target){if(e.hydrate){U();const a=it(e.target);u.fragment&&u.fragment.l(a),a.forEach(tt)}else u.fragment&&u.fragment.c();e.intro&&ut(t.$$.fragment),ft(t,e.target,e.anchor,e.customElement),V(),G()}y(c)}class oe{$destroy(){dt(this,1),this.$destroy=g}$on(e,n){if(!L(n))return g;const i=this.$$.callbacks[e]||(this.$$.callbacks[e]=[]);return i.push(n),()=>{const r=i.indexOf(n);r!==-1&&i.splice(r,1)}}$set(e){this.$$set&&!K(e)&&(this.$$.skip_bound=!0,this.$$set(e),this.$$.skip_bound=!1)}}export{Pt as $,ft as A,dt as B,gt as C,xt as D,$t as E,bt as F,Z as G,g as H,yt as I,pt as J,Wt as K,wt as L,vt as M,J as N,ht as O,nt as P,Tt as Q,At as R,oe as S,kt as T,x as U,Q as V,Jt as W,Zt as X,te as Y,Gt as Z,Ht as _,Nt as a,Bt as a0,L as a1,jt as a2,ee as a3,Qt as a4,zt as a5,j as a6,Ot as a7,Yt as a8,Et as b,qt as c,Xt as d,St as e,Vt as f,ut as g,tt as h,re as i,Rt as j,et as k,Dt as l,it as m,Ct as n,It as o,Lt as p,C as q,ot as r,mt as s,Kt as t,Mt as u,Ut as v,M as w,Ft as x,ne as y,ie as z};
function E(){}const dt=t=>t;function J(t,n){for(const e in n)t[e]=n[e];return t}function L(t){return t()}function D(){return Object.create(null)}function y(t){t.forEach(L)}function K(t){return typeof t=="function"}function _t(t,n){return t!=t?n==n:t!==n||t&&typeof t=="object"||typeof t=="function"}let x;function ht(t,n){return x||(x=document.createElement("a")),x.href=n,t===x.href}function Q(t){return Object.keys(t).length===0}function R(t,...n){if(t==null)return E;const e=t.subscribe(...n);return e.unsubscribe?()=>e.unsubscribe():e}function mt(t,n,e){t.$$.on_destroy.push(R(n,e))}function pt(t,n,e,i){if(t){const c=z(t,n,e,i);return t[0](c)}}function z(t,n,e,i){return t[1]&&i?J(e.ctx.slice(),t[1](i(n))):e.ctx}function yt(t,n,e,i){if(t[2]&&i){const c=t[2](i(e));if(n.dirty===void 0)return c;if(typeof c=="object"){const u=[],o=Math.max(n.dirty.length,c.length);for(let s=0;s<o;s+=1)u[s]=n.dirty[s]|c[s];return u}return n.dirty|c}return n.dirty}function gt(t,n,e,i,c,u){if(c){const o=z(n,e,i,u);t.p(o,c)}}function bt(t){if(t.ctx.length>32){const n=[],e=t.ctx.length/32;for(let i=0;i<e;i++)n[i]=-1;return n}return-1}const B=typeof window<"u";let xt=B?()=>window.performance.now():()=>Date.now(),O=B?t=>requestAnimationFrame(t):E;const _=new Set;function P(t){_.forEach(n=>{n.c(t)||(_.delete(n),n.f())}),_.size!==0&&O(P)}function $t(t){let n;return _.size===0&&O(P),{promise:new Promise(e=>{_.add(n={c:t,f:e})}),abort(){_.delete(n)}}}let k=!1;function U(){k=!0}function V(){k=!1}function X(t,n,e,i){for(;t<n;){const c=t+(n-t>>1);e(c)<=i?t=c+1:n=c}return t}function Y(t){if(t.hydrate_init)return;t.hydrate_init=!0;let n=t.childNodes;if(t.nodeName==="HEAD"){const r=[];for(let l=0;l<n.length;l++){const f=n[l];f.claim_order!==void 0&&r.push(f)}n=r}const e=new Int32Array(n.length+1),i=new Int32Array(n.length);e[0]=-1;let c=0;for(let r=0;r<n.length;r++){const l=n[r].claim_order,f=(c>0&&n[e[c]].claim_order<=l?c+1:X(1,c,b=>n[e[b]].claim_order,l))-1;i[r]=e[f]+1;const a=f+1;e[a]=r,c=Math.max(a,c)}const u=[],o=[];let s=n.length-1;for(let r=e[c]+1;r!=0;r=i[r-1]){for(u.push(n[r-1]);s>=r;s--)o.push(n[s]);s--}for(;s>=0;s--)o.push(n[s]);u.reverse(),o.sort((r,l)=>r.claim_order-l.claim_order);for(let r=0,l=0;r<o.length;r++){for(;l<u.length&&o[r].claim_order>=u[l].claim_order;)l++;const f=l<u.length?u[l]:null;t.insertBefore(o[r],f)}}function Z(t,n){if(k){for(Y(t),(t.actual_end_child===void 0||t.actual_end_child!==null&&t.actual_end_child.parentElement!==t)&&(t.actual_end_child=t.firstChild);t.actual_end_child!==null&&t.actual_end_child.claim_order===void 0;)t.actual_end_child=t.actual_end_child.nextSibling;n!==t.actual_end_child?(n.claim_order!==void 0||n.parentNode!==t)&&t.insertBefore(n,t.actual_end_child):t.actual_end_child=n.nextSibling}else(n.parentNode!==t||n.nextSibling!==null)&&t.appendChild(n)}function wt(t,n,e){k&&!e?Z(t,n):(n.parentNode!==t||n.nextSibling!=e)&&t.insertBefore(n,e||null)}function tt(t){t.parentNode.removeChild(t)}function vt(t,n){for(let e=0;e<t.length;e+=1)t[e]&&t[e].d(n)}function nt(t){return document.createElement(t)}function et(t){return document.createElementNS("http://www.w3.org/2000/svg",t)}function C(t){return document.createTextNode(t)}function Et(){return C(" ")}function kt(){return C("")}function St(t,n,e,i){return t.addEventListener(n,e,i),()=>t.removeEventListener(n,e,i)}function At(t){return function(n){return n.preventDefault(),t.call(this,n)}}function Nt(t,n,e){e==null?t.removeAttribute(n):t.getAttribute(n)!==e&&t.setAttribute(n,e)}function it(t){return Array.from(t.childNodes)}function ct(t){t.claim_info===void 0&&(t.claim_info={last_index:0,total_claimed:0})}function F(t,n,e,i,c=!1){ct(t);const u=(()=>{for(let o=t.claim_info.last_index;o<t.length;o++){const s=t[o];if(n(s)){const r=e(s);return r===void 0?t.splice(o,1):t[o]=r,c||(t.claim_info.last_index=o),s}}for(let o=t.claim_info.last_index-1;o>=0;o--){const s=t[o];if(n(s)){const r=e(s);return r===void 0?t.splice(o,1):t[o]=r,c?r===void 0&&t.claim_info.last_index--:t.claim_info.last_index=o,s}}return i()})();return u.claim_order=t.claim_info.total_claimed,t.claim_info.total_claimed+=1,u}function I(t,n,e,i){return F(t,c=>c.nodeName===n,c=>{const u=[];for(let o=0;o<c.attributes.length;o++){const s=c.attributes[o];e[s.name]||u.push(s.name)}u.forEach(o=>c.removeAttribute(o))},()=>i(n))}function jt(t,n,e){return I(t,n,e,nt)}function Ct(t,n,e){return I(t,n,e,et)}function rt(t,n){return F(t,e=>e.nodeType===3,e=>{const i=""+n;if(e.data.startsWith(i)){if(e.data.length!==i.length)return e.splitText(i.length)}else e.data=i},()=>C(n),!0)}function qt(t){return rt(t," ")}function Tt(t,n){n=""+n,t.wholeText!==n&&(t.data=n)}function Dt(t,n){t.value=n==null?"":n}function Mt(t,n,e,i){t.style.setProperty(n,e,i?"important":"")}function Lt(t,n){for(let e=0;e<t.options.length;e+=1){const i=t.options[e];if(i.__value===n){i.selected=!0;return}}t.selectedIndex=-1}function zt(t){const n=t.querySelector(":checked")||t.options[0];return n&&n.__value}function Bt(t,n,e){t.classList[e?"add":"remove"](n)}function ot(t,n,e=!1){const i=document.createEvent("CustomEvent");return i.initCustomEvent(t,e,!1,n),i}function Ot(t,n=document.body){return Array.from(n.querySelectorAll(t))}let p;function m(t){p=t}function g(){if(!p)throw new Error("Function called outside component initialization");return p}function Pt(t){g().$$.on_mount.push(t)}function Ft(t){g().$$.after_update.push(t)}function It(t){g().$$.on_destroy.push(t)}function Ht(){const t=g();return(n,e)=>{const i=t.$$.callbacks[n];if(i){const c=ot(n,e);i.slice().forEach(u=>{u.call(t,c)})}}}function Wt(t,n){g().$$.context.set(t,n)}function Gt(t,n){const e=t.$$.callbacks[n.type];e&&e.slice().forEach(i=>i.call(this,n))}const h=[],M=[],w=[],A=[],H=Promise.resolve();let N=!1;function W(){N||(N=!0,H.then(G))}function Jt(){return W(),H}function j(t){w.push(t)}function Kt(t){A.push(t)}const S=new Set;let $=0;function G(){const t=p;do{for(;$<h.length;){const n=h[$];$++,m(n),st(n.$$)}for(m(null),h.length=0,$=0;M.length;)M.pop()();for(let n=0;n<w.length;n+=1){const e=w[n];S.has(e)||(S.add(e),e())}w.length=0}while(h.length);for(;A.length;)A.pop()();N=!1,S.clear(),m(t)}function st(t){if(t.fragment!==null){t.update(),y(t.before_update);const n=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,n),t.after_update.forEach(j)}}const v=new Set;let d;function Qt(){d={r:0,c:[],p:d}}function Rt(){d.r||y(d.c),d=d.p}function lt(t,n){t&&t.i&&(v.delete(t),t.i(n))}function Ut(t,n,e,i){if(t&&t.o){if(v.has(t))return;v.add(t),d.c.push(()=>{v.delete(t),i&&(e&&t.d(1),i())}),t.o(n)}}const Vt=typeof window<"u"?window:typeof globalThis<"u"?globalThis:global;function Xt(t,n){const e={},i={},c={$$scope:1};let u=t.length;for(;u--;){const o=t[u],s=n[u];if(s){for(const r in o)r in s||(i[r]=1);for(const r in s)c[r]||(e[r]=s[r],c[r]=1);t[u]=s}else for(const r in o)c[r]=1}for(const o in i)o in e||(e[o]=void 0);return e}function Yt(t){return typeof t=="object"&&t!==null?t:{}}function Zt(t,n,e){const i=t.$$.props[n];i!==void 0&&(t.$$.bound[i]=e,e(t.$$.ctx[i]))}function tn(t){t&&t.c()}function nn(t,n){t&&t.l(n)}function ut(t,n,e,i){const{fragment:c,on_mount:u,on_destroy:o,after_update:s}=t.$$;c&&c.m(n,e),i||j(()=>{const r=u.map(L).filter(K);o?o.push(...r):y(r),t.$$.on_mount=[]}),s.forEach(j)}function at(t,n){const e=t.$$;e.fragment!==null&&(y(e.on_destroy),e.fragment&&e.fragment.d(n),e.on_destroy=e.fragment=null,e.ctx=[])}function ft(t,n){t.$$.dirty[0]===-1&&(h.push(t),W(),t.$$.dirty.fill(0)),t.$$.dirty[n/31|0]|=1<<n%31}function en(t,n,e,i,c,u,o,s=[-1]){const r=p;m(t);const l=t.$$={fragment:null,ctx:null,props:u,update:E,not_equal:c,bound:D(),on_mount:[],on_destroy:[],on_disconnect:[],before_update:[],after_update:[],context:new Map(n.context||(r?r.$$.context:[])),callbacks:D(),dirty:s,skip_bound:!1,root:n.target||r.$$.root};o&&o(l.root);let f=!1;if(l.ctx=e?e(t,n.props||{},(a,b,...q)=>{const T=q.length?q[0]:b;return l.ctx&&c(l.ctx[a],l.ctx[a]=T)&&(!l.skip_bound&&l.bound[a]&&l.bound[a](T),f&&ft(t,a)),b}):[],l.update(),f=!0,y(l.before_update),l.fragment=i?i(l.ctx):!1,n.target){if(n.hydrate){U();const a=it(n.target);l.fragment&&l.fragment.l(a),a.forEach(tt)}else l.fragment&&l.fragment.c();n.intro&&lt(t.$$.fragment),ut(t,n.target,n.anchor,n.customElement),V(),G()}m(r)}class cn{$destroy(){at(this,1),this.$destroy=E}$on(n,e){const i=this.$$.callbacks[n]||(this.$$.callbacks[n]=[]);return i.push(e),()=>{const c=i.indexOf(e);c!==-1&&i.splice(c,1)}}$set(n){this.$$set&&!Q(n)&&(this.$$.skip_bound=!0,this.$$set(n),this.$$.skip_bound=!1)}}export{It as $,Yt as A,at as B,J as C,Jt as D,E,pt as F,gt as G,bt as H,yt as I,Z as J,ht as K,xt as L,$t as M,dt as N,et as O,Ct as P,mt as Q,St as R,cn as S,vt as T,y as U,R as V,Gt as W,M as X,Ht as Y,Ot as Z,Dt as _,Et as a,Bt as a0,K as a1,At as a2,Zt as a3,Kt as a4,zt as a5,j as a6,Lt as a7,Vt as a8,wt as b,qt as c,Rt as d,kt as e,lt as f,Qt as g,tt as h,en as i,Wt as j,Ft as k,nt as l,jt as m,it as n,Pt as o,Nt as p,Mt as q,C as r,_t as s,Ut as t,rt as u,Tt as v,tn as w,nn as x,ut as y,Xt as z};

import{r as h,j as s}from"./vendor-query-C-ewo9kA.js";import{d,c as a}from"./index-CLF0Vqaj.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=d("ArrowDown",[["path",{d:"M12 5v14",key:"s699le"}],["path",{d:"m19 12-7 7-7-7",key:"1idqje"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=d("ArrowUpDown",[["path",{d:"m21 16-4 4-4-4",key:"f6ql7i"}],["path",{d:"M17 20V4",key:"1ejh1v"}],["path",{d:"m3 8 4-4 4 4",key:"11wl7u"}],["path",{d:"M7 4v16",key:"1glfcx"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=d("ArrowUp",[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]]);function _({columns:l,data:p,onRowClick:n,className:u}){const[r,y]=h.useState(null),[c,x]=h.useState("asc");function j(e){r===e?x(c==="asc"?"desc":"asc"):(y(e),x("asc"))}const b=r?[...p].sort((e,o)=>{const t=e[r],i=o[r];if(t==null||i==null)return 0;const m=t<i?-1:t>i?1:0;return c==="asc"?m:-m}):p;function f(e){return r!==e?s.jsx(k,{className:"h-3 w-3 text-zinc-500"}):c==="asc"?s.jsx(v,{className:"h-3 w-3 text-zinc-300"}):s.jsx(w,{className:"h-3 w-3 text-zinc-300"})}return s.jsx("div",{className:a("overflow-x-auto rounded-lg border border-zinc-800",u),children:s.jsxs("table",{className:"w-full text-left text-sm",children:[s.jsx("thead",{className:"border-b border-zinc-800 bg-zinc-900",children:s.jsx("tr",{children:l.map(e=>s.jsx("th",{className:a("px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-400",e.sortable&&"cursor-pointer select-none",e.className),onClick:e.sortable?()=>j(e.key):void 0,children:s.jsxs("span",{className:"inline-flex items-center gap-1",children:[e.header,e.sortable&&f(e.key)]})},e.key))})}),s.jsx("tbody",{className:"divide-y divide-zinc-800 bg-zinc-900/50",children:b.map((e,o)=>s.jsx("tr",{onClick:n?()=>n(e):void 0,className:a("transition-colors",n&&"cursor-pointer hover:bg-zinc-800/50"),children:l.map(t=>s.jsx("td",{className:a("px-4 py-3 text-zinc-200",t.className),children:t.render(e)},t.key))},o))})]})})}export{_ as D};

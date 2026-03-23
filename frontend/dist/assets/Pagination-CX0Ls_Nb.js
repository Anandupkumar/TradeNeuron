import{d as c,c as d}from"./index-CLF0Vqaj.js";import{j as e}from"./vendor-query-C-ewo9kA.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=c("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=c("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=c("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);function j({page:n,total_pages:r,onPageChange:s,page_sizes:i,current_size:m,onPageSizeChange:o}){const a=n<=1,l=n>=r;return e.jsxs("div",{className:"flex items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("button",{disabled:a,onClick:()=>s(n-1),className:d("inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900 p-1.5 transition-colors",a?"cursor-not-allowed opacity-40":"hover:bg-zinc-800"),children:e.jsx(x,{className:"h-4 w-4 text-zinc-300"})}),e.jsxs("span",{className:"text-sm text-zinc-400",children:["Page ",n," of ",r]}),e.jsx("button",{disabled:l,onClick:()=>s(n+1),className:d("inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900 p-1.5 transition-colors",l?"cursor-not-allowed opacity-40":"hover:bg-zinc-800"),children:e.jsx(h,{className:"h-4 w-4 text-zinc-300"})})]}),i&&o&&e.jsx("select",{value:m,onChange:t=>o(Number(t.target.value)),className:"rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-300 outline-none focus:border-zinc-600",children:i.map(t=>e.jsxs("option",{value:t,children:[t," / page"]},t))})]})}export{j as P,f as S};

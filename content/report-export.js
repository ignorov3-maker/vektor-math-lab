((root)=>{
 const cell=v=>{let s=v==null?'':String(v);if(typeof v!=='number'&&/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 root.VEKTOR_REPORT_EXPORT={csv:rows=>'\ufeff'+rows.map(row=>row.map(cell).join(';')).join('\r\n')+'\r\n'};
})(typeof window==='undefined'?globalThis:window);

let adminCode = '';
const $ = id => document.getElementById(id);
const fmt = n => Math.round(Number(n || 0)).toLocaleString('vi-VN');
const money = n => fmt(n) + 'đ';
function showStatus(text, isError=false){ const el=$('status'); el.style.display='block'; el.style.background=isError?'#fff1f1':'#faf6ed'; el.style.color=isError?'#9f1d1d':'#6f5525'; el.textContent=text; }
async function api(url, options={}) { const res = await fetch(url, options); const data = await res.json(); if (!res.ok || data.ok === false) throw new Error(data.message || 'Có lỗi xảy ra'); return data; }
function esc(v){ return String(v ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
function setText(id, text){ const el=$(id); if(el) el.textContent = text; }
function pct(v, max){ return Math.max(2, Math.min(100, Math.abs(Number(v||0)) / Math.max(max, 1) * 100)); }

function displayDate(v){
  const s = String(v || '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}
function displayMonth(v){
  const s = String(v || '').trim();
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (m) return `${m[2]}/${m[1]}`;
  return s;
}
function displayDateRange(v){
  const s = String(v || '').trim();
  return s.replace(/(\d{4}-\d{2}-\d{2})/g, x => displayDate(x));
}
function uiDateToIso(v){
  const s = String(v || '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  return s;
}


function renderBars(id, rows, maxRows, valueField='netRevenue', labelMode='label') {
  const wrap = $(id);
  const arr = (rows || []).slice(0, maxRows || 20);
  if (!arr.length) { wrap.innerHTML='<div class="empty">Chưa có dữ liệu</div>'; return; }
  const max = Math.max(...arr.map(r => Math.abs(Number(r[valueField] || 0))), 1);
  wrap.innerHTML = arr.map(r => {
    const v = Number(r[valueField] || 0);
    let label = labelMode === 'key' ? (r.key || 'Chưa rõ') : (r.label || r.key || 'Chưa rõ');
    if (id === 'byDay') label = displayDate(label);
    if (id === 'byMonth') label = displayMonth(label);
    return `<div class="bar-row"><div class="bar-label" title="${esc(label)}">${esc(label)}</div><div class="bar-track"><div class="bar-fill" style="width:${pct(v,max)}%"></div></div><div class="bar-value">${money(v)}</div></div>`;
  }).join('');
}
function renderGroupBars(rows) {
  const wrap = $('byGroup');
  let arr = (rows || []).filter(r => String(r.key || r.label || '').trim()).slice(0, 8);
  if (!arr.length) { wrap.innerHTML='<div class="empty">Chưa có dữ liệu nhóm giỏ</div>'; return; }
  const max = Math.max(...arr.map(r => Math.abs(Number(r.qty || 0))), 1);
  wrap.innerHTML = arr.map(r => {
    const qty = Number(r.qty || 0);
    const label = r.label || r.key || 'Chưa rõ';
    return `<div class="bar-row group-row"><div class="bar-label" title="${esc(label)}">${esc(label)}</div><div class="bar-track"><div class="bar-fill" style="width:${pct(qty,max)}%"></div></div><div class="bar-value">${fmt(qty)} giỏ<br><span>${money(r.netRevenue || 0)}</span></div></div>`;
  }).join('');
}
function renderPriceBuckets(rows) {
  const wrap = $('byPrice');
  const arr = (rows || []).filter(r => String(r.key || r.label || '').trim()).slice(0, 10);
  if (!arr.length) { wrap.innerHTML='<div class="empty">Chưa có dữ liệu phân khúc giá</div>'; return; }
  const max = Math.max(...arr.map(r => Math.abs(Number(r.netRevenue || 0))), 1);
  wrap.innerHTML = arr.map(r => {
    const v = Number(r.netRevenue || 0);
    const label = r.label || r.key || 'Chưa rõ';
    return `<div class="bar-row"><div class="bar-label" title="${esc(label)}">${esc(label)}</div><div class="bar-track"><div class="bar-fill" style="width:${pct(v,max)}%"></div></div><div class="bar-value">${money(v)}</div></div>`;
  }).join('');
}
function describeCodeRow(r) {
  const note = String(r.groupNote || '').trim();
  if (!note) return 'Bán trực tiếp mã này';
  const sapoCodes = [];
  let reportCode = r.key || '';
  const re = /(?:Gộp từ mã Sapo|Auto gom gần giống):\s*([^;]+);\s*Báo cáo về:\s*([^;]+)/g;
  let m;
  while ((m = re.exec(note)) !== null) {
    const sapo = String(m[1] || '').trim();
    const report = String(m[2] || '').trim();
    if (sapo && !sapoCodes.includes(sapo)) sapoCodes.push(sapo);
    if (report) reportCode = report;
  }
  if (sapoCodes.length) return `Gộp từ mã Sapo: ${sapoCodes.join(', ')}\nBáo cáo về: ${reportCode}`;
  return 'Bán trực tiếp mã này';
}
function renderCodeTable(rows) {
  const wrap = $('byCode');
  const arr = (rows || []).slice(0, 10);
  if (!arr.length) { wrap.innerHTML='<div class="empty">Chưa có dữ liệu mã báo cáo</div>'; return; }
  wrap.innerHTML = `<table class="code-table"><thead><tr><th>Mã báo cáo</th><th>Mô tả báo cáo</th><th>SL</th><th>Số đơn</th><th>Doanh thu</th><th>Đơn giá TB</th></tr></thead><tbody>${arr.map(r=>{
    const aov = Number(r.qty || 0) ? Number(r.revenue || 0) / Number(r.qty || 0) : 0;
    const descHtml = esc(describeCodeRow(r)).replace(/\n/g, '<br>');
    return `<tr><td><b>${esc(r.key)}</b></td><td>${descHtml}</td><td class="center">${fmt(r.qty)}</td><td class="center">${fmt(r.orders)}</td><td class="money">${money(r.netRevenue)}</td><td class="money">${money(aov)}</td></tr>`;
  }).join('')}</tbody></table>`;
}
function renderImports(rows) {
  if (!rows || !rows.length) { $('imports').innerHTML='<div class="empty">Chưa có lịch sử import</div>'; return; }
  $('imports').innerHTML = `<table class="imports-table"><thead><tr><th>Thời gian</th><th>File</th><th>Ngày dữ liệu</th><th>Dòng</th><th>Doanh thu</th></tr></thead><tbody>${rows.slice(0,10).map(r=>`<tr><td>${esc(r.importedAt)}</td><td>${esc(r.sapoFileName)}</td><td>${esc(displayDateRange(r.dateRange))}</td><td>${fmt(r.rowCount)}</td><td>${money(r.revenue || r.netRevenue)}</td></tr>`).join('')}</tbody></table>`;
}
function renderInsights(q) {
  q = q || {};
  const bestDayText = q.bestDay ? displayDate(q.bestDay.date || q.bestDay.key || q.bestDay.label) : '-';
  setText('bestDay', bestDayText);
  setText('bestDaySub', q.bestDay ? money(q.bestDay.value) : '');
  setText('bestGroup', q.bestGroup ? q.bestGroup.label : '-');
  setText('bestGroupSub', q.bestGroup ? `${fmt(q.bestGroup.qty)} giỏ · ${money(q.bestGroup.value)}` : '');
  setText('bestCode', q.bestCode ? q.bestCode.label : '-');
  setText('bestCodeSub', q.bestCode ? money(q.bestCode.value) : '');
  setText('bestPrice', q.bestPrice ? q.bestPrice.label : '-');
  setText('bestPriceSub', q.bestPrice ? money(q.bestPrice.value) : '');
}

function renderAnalysisCards(analysis) {
  const wrap = $('analysisCards');
  if (!wrap) return;
  analysis = analysis || {};
  const cards = [];
  if (analysis.topShare) {
    cards.push({
      title: 'Mã đóng góp nổi bật',
      big: `${analysis.topShare.code} · ${analysis.topShare.share}% doanh thu`,
      text: `Đóng góp ${money(analysis.topShare.revenue)} trong kỳ đang xem. Đây là mã nên theo dõi để duy trì mẫu/quy cách bán ổn định.`
    });
  }
  if (analysis.repeatByDay) {
    const list = (analysis.repeatList || []).slice(0, 3).map(x => `${x.code}: ${x.dayCount} ngày`).join(' · ');
    cards.push({
      title: 'Mã giỏ được mua đi mua lại',
      big: `${analysis.repeatByDay.code} · ${analysis.repeatByDay.dayCount} ngày`,
      text: `${fmt(analysis.repeatByDay.orders)} đơn, ${fmt(analysis.repeatByDay.qty)} giỏ. ${list ? 'Top lặp lại: ' + list + '.' : analysis.repeatByDay.note}`
    });
  }
  if (analysis.highValueCode) {
    cards.push({
      title: 'Mã giá trị bình quân cao',
      big: `${analysis.highValueCode.code} · ${money(analysis.highValueCode.value)}/giỏ`,
      text: `${fmt(analysis.highValueCode.orders)} đơn, doanh thu ${money(analysis.highValueCode.netRevenue)}. Phù hợp theo dõi nhóm giỏ giá trị cao.`
    });
  }
  if (analysis.volumeLowAov) {
    cards.push({
      title: 'Mã bán nhiều, giá dễ tiếp cận',
      big: `${analysis.volumeLowAov.code} · ${fmt(analysis.volumeLowAov.qty)} giỏ`,
      text: `Đơn giá TB ${money(analysis.volumeLowAov.value)}/giỏ. Có thể là mẫu chạy số lượng, cần giữ ổn định hình ảnh và nguyên liệu.`
    });
  }
  if (analysis.bestGroup) {
    cards.push({
      title: 'Nhóm giỏ cần ưu tiên',
      big: `${analysis.bestGroup.label} · ${fmt(analysis.bestGroup.qty)} giỏ`,
      text: `Đóng góp ${money(analysis.bestGroup.netRevenue)} trong kỳ xem. Nên theo dõi tồn nguyên liệu theo nhóm này.`
    });
  }
  if (analysis.bestPrice) {
    cards.push({
      title: 'Phân khúc giá đang mạnh',
      big: `${analysis.bestPrice.label}`,
      text: `Đóng góp ${money(analysis.bestPrice.netRevenue)}. Hỗ trợ định hướng mẫu giỏ và tư vấn giá bán.`
    });
  }
  cards.push({
    title: 'Cách hiểu chỉ số bán lặp lại',
    big: 'Theo mã giỏ, không theo khách',
    text: analysis.dataReadiness?.repeatCustomer || 'Chỉ số này đếm số ngày mã giỏ phát sinh bán trong kỳ xem, không cần mã khách/SĐT.'
  });
  wrap.innerHTML = cards.map(c => `<div class="analysis-card"><b>${esc(c.title)}</b><div class="big">${esc(c.big)}</div><p>${esc(c.text)}</p></div>`).join('');
}
function renderDataNotice(state) {
  const el = $('dataNotice');
  if (!el) return;
  const range = state.allDataDateRangeText || displayDateRange(state.dateRange || '');
  const latest = state.latestDataDateText || '';
  el.innerHTML = `Báo cáo đã cập nhật dữ liệu từ <b>${esc(range)}</b>. ${latest ? `Ngày dữ liệu mới nhất: <b>${esc(latest)}</b>.` : ''} <span class="warn">Nếu chưa sát ngày hiện tại, vui lòng liên hệ người phụ trách.</span>`;
}

function renderState(state) {
  if ($('versionText')) $('versionText').textContent = 'Hỗ trợ thông tin: Phòng QTTH';
  renderDataNotice(state);
  $('metaText').textContent = `${displayDateRange(state.dateRange)} · Cập nhật gần nhất: ${state.lastImportedAt} · Số dòng đổi mã: ${state.mappingCount}`;
  $('revenue').textContent = money(state.metrics.revenue);
  $('netRevenue').textContent = money(state.metrics.netRevenue);
  $('qty').textContent = fmt(state.metrics.qty);
  $('aov').textContent = money(state.metrics.aov);
  renderInsights(state.quickInsights);
  renderBars('byDay', state.byDay, 31, 'netRevenue');
  renderBars('byMonth', state.byMonth, 12, 'netRevenue');
  renderGroupBars(state.byGroup || state.byBasketType || []);
  renderPriceBuckets(state.byPrice);
  renderCodeTable(state.byCode);
  renderAnalysisCards(state.usefulAnalysis);
  renderImports(state.imports);
}
async function loadDashboard(filter='latest_month') { renderState(await api(`/api/sapo/dashboard?filter=${encodeURIComponent(filter)}`)); }
$('btnUnlock').onclick = async () => { try { adminCode = $('adminCode').value.trim(); await api('/api/sapo/admin/verify',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({adminCode})}); document.body.classList.add('admin-mode'); $('adminStatus').textContent='Đã mở'; } catch(e){ alert(e.message); } };
document.querySelectorAll('.filters button').forEach(btn => btn.onclick = async () => { document.querySelectorAll('.filters button').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); await loadDashboard(btn.dataset.filter); });
$('btnRange').onclick = async () => { try { renderState(await api(`/api/sapo/dashboard/range?fromDate=${encodeURIComponent(uiDateToIso($('fromDate').value))}&toDate=${encodeURIComponent(uiDateToIso($('toDate').value))}`)); } catch(e){ alert(e.message); } };
$('btnMonth').onclick = async () => { try { renderState(await api(`/api/sapo/dashboard/month?month=${$('monthText').value}`)); } catch(e){ alert(e.message); } };
$('btnImport').onclick = async () => { try { const sapo=$('sapoFile').files[0]; if(!sapo) return alert('Anh chọn file báo cáo Sapo trước.'); const fd=new FormData(); fd.append('adminCode', adminCode); fd.append('sapoFile', sapo); if($('mappingFile').files[0]) fd.append('mappingFile', $('mappingFile').files[0]); showStatus('Đang kiểm tra và cập nhật dữ liệu...'); const result=await api('/api/sapo/import',{method:'POST', body:fd}); showStatus(result.message || 'Đã nạp xong'); await loadDashboard('latest_month'); } catch(e){ showStatus(e.message,true); } };
$('btnUndo').onclick = async () => { if(!confirm('Xóa upload gần nhất?')) return; try { await api('/api/sapo/admin/delete-latest',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({adminCode})}); showStatus('Đã xóa upload gần nhất.'); await loadDashboard('latest_month'); } catch(e){ showStatus(e.message,true); } };
loadDashboard('latest_month').catch(e => alert(e.message));

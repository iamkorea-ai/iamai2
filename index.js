import Head from 'next/head'
import { useState, useRef } from 'react'
import styles from '../styles/Home.module.css'

const RANGES = {
  hb:       { min: 12,  max: 17,  label: '헤모글로빈',    unit: 'g/dL',      placeholder: '예: 14.2' },
  wbc:      { min: 4,   max: 10,  label: '백혈구 WBC',    unit: '×10³/μL',   placeholder: '예: 6.5' },
  plt:      { min: 150, max: 400, label: '혈소판',         unit: '×10³/μL',   placeholder: '예: 250' },
  ferritin: { min: 12,  max: 150, label: '페리틴',         unit: 'ng/mL',     placeholder: '예: 45' },
  tsh:      { min: 0.4, max: 4.0, label: 'TSH',           unit: 'mIU/L',     placeholder: '예: 1.8' },
  ft4:      { min: 0.8, max: 1.8, label: 'Free T4',       unit: 'ng/dL',     placeholder: '예: 1.2' },
  selenium: { min: 70,  max: 150, label: '셀레늄',         unit: 'μg/L',      placeholder: '예: 95' },
  vitd:     { min: 30,  max: 100, label: '비타민 D',       unit: 'ng/mL',     placeholder: '예: 35' },
  glucose:  { min: 70,  max: 100, label: '공복혈당',       unit: 'mg/dL',     placeholder: '예: 88' },
  ldl:      { min: 0,   max: 130, label: 'LDL 콜레스테롤', unit: 'mg/dL',    placeholder: '예: 110' },
  tg:       { min: 0,   max: 150, label: '중성지방',       unit: 'mg/dL',     placeholder: '예: 120' },
  alt:      { min: 0,   max: 40,  label: 'ALT (GPT)',      unit: 'U/L',       placeholder: '예: 25' },
}

function getStatus(key, value) {
  if (!value || value === '') return null
  const v = parseFloat(value)
  const { min, max } = RANGES[key]
  if (v < min) return 'low'
  if (v > max) return 'high'
  return 'ok'
}

export default function Home() {
  const [mode, setMode] = useState('ocr')
  const [step, setStep] = useState(1)
  const [vals, setVals] = useState({})
  const [imgPreview, setImgPreview] = useState(null)
  const [imgBase64, setImgBase64] = useState(null)
  const [imgType, setImgType] = useState('image/jpeg')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrDone, setOcrDone] = useState(false)
  const [ocrSummary, setOcrSummary] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  function handleFile(file) {
    if (!file) return
    setImgType(file.type || 'image/jpeg')
    const reader = new FileReader()
    reader.onload = (e) => {
      setImgPreview(e.target.result)
      setImgBase64(e.target.result.split(',')[1])
      setOcrDone(false)
      setOcrSummary('')
    }
    reader.readAsDataURL(file)
  }

  function resetOcr() {
    setImgPreview(null)
    setImgBase64(null)
    setOcrDone(false)
    setOcrSummary('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function doOcr() {
    if (!imgBase64) return
    setOcrLoading(true)
    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imgBase64, mediaType: imgType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '추출 실패')

      const extracted = data.result
      const newVals = { ...vals }
      Object.keys(RANGES).forEach(k => {
        if (extracted[k] != null) newVals[k] = String(extracted[k])
      })
      setVals(newVals)
      setOcrSummary(extracted.summary || '수치 추출 완료')
      setOcrDone(true)
      setTimeout(() => setMode('manual'), 700)
    } catch (e) {
      alert('OCR 오류: ' + e.message)
    } finally {
      setOcrLoading(false)
    }
  }

  async function doAnalyze() {
    const entered = Object.keys(RANGES).filter(k => vals[k] && vals[k] !== '')
    if (entered.length === 0) {
      alert('최소 1개 이상의 검사 수치를 입력해주세요.')
      return
    }
    setAnalyzing(true)
    setError(null)
    setResult(null)
    setStep(2)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vals }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '분석 실패')
      setResult(data.result)
      setStep(3)
    } catch (e) {
      setError(e.message)
      setStep(1)
    } finally {
      setAnalyzing(false)
    }
  }

  function getStatusClass(key) {
    const s = getStatus(key, vals[key])
    return s ? styles['inp_' + s] : ''
  }

  const scoreColor = (s) => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className={styles.wrap}>
      <Head>
        <title>IAM AI — 혈액검사 기반 맞춤 건강관리</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>
            <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
              <path d="M8 2v12M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className={styles.logoName}>IAM <span>AI</span></span>
        </div>
        <span className={styles.badge}>Beta</span>
      </header>

      {/* HERO */}
      <div className={styles.hero}>
        <span className={styles.heroTag}>IAM GLOBALNET × Dr.Skin Bio.Lab.</span>
        <h1>혈액검사 기반<br /><em>개인 맞춤 건강관리</em></h1>
        <p>결과지 사진을 올리거나 수치를 입력하면 Daily Mix 솔루션을 제안해드려요.</p>
        <small>* 본 서비스는 참고용이며 의료 진단을 대체하지 않습니다.</small>
      </div>

      <div className={styles.main}>

        {/* STEPS */}
        <div className={styles.steps}>
          {['수치 입력', 'AI 분석', '솔루션'].map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div className={`${styles.step} ${step === i+1 ? styles.stepActive : ''} ${step > i+1 ? styles.stepDone : ''}`}>
                <div className={styles.stepN}>{step > i+1 ? '✓' : i+1}</div>
                <span className={styles.stepLabel}>{label}</span>
              </div>
              {i < 2 && <div className={styles.stepDiv} />}
            </div>
          ))}
        </div>

        {/* INPUT CARD */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h2>혈액검사 결과 입력</h2>
            <p>결과지 사진을 올리거나, 수치를 직접 입력해주세요.</p>
          </div>
          <div className={styles.cardBody}>

            {/* MODE TABS */}
            <div className={styles.modeTabs}>
              <button className={`${styles.modeTab} ${mode === 'ocr' ? styles.modeTabActive : ''}`} onClick={() => setMode('ocr')}>📷 결과지 사진 업로드</button>
              <button className={`${styles.modeTab} ${mode === 'manual' ? styles.modeTabActive : ''}`} onClick={() => setMode('manual')}>✏️ 수치 직접 입력</button>
            </div>

            {/* OCR */}
            {mode === 'ocr' && (
              <div>
                <div
                  className={styles.ocrZone}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
                >
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => handleFile(e.target.files[0])} />
                  <div className={styles.ocrIcon}>📄</div>
                  <h3>결과지 사진을 여기에 올려주세요</h3>
                  <p>클릭하거나 파일을 드래그해서 업로드</p>
                </div>

                {imgPreview && (
                  <div className={styles.ocrPreview}>
                    <div className={styles.ocrPreviewHead}>
                      <span>📄 업로드된 결과지</span>
                      <button className={styles.btnReset} onClick={resetOcr}>다시 선택</button>
                    </div>
                    <img src={imgPreview} alt="미리보기" style={{ width: '100%', maxHeight: 260, objectFit: 'contain', background: '#f0f0f0', display: 'block' }} />
                    <div style={{ padding: '12px 16px' }}>
                      <button className={styles.btnExtract} onClick={doOcr} disabled={ocrLoading}>
                        {ocrLoading ? '⏳ 추출 중...' : ocrDone ? '✅ 추출 완료' : '🔍 AI로 수치 자동 추출하기'}
                      </button>
                      {ocrDone && <p className={styles.ocrDone}>{ocrSummary}</p>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MANUAL */}
            {mode === 'manual' && (
              <div>
                <p className={styles.secTitle}>기본 정보</p>
                <div className={styles.grid3}>
                  <div className={styles.fg}>
                    <label>나이</label>
                    <input type="number" placeholder="예: 45" value={vals.age || ''} onChange={e => setVals({ ...vals, age: e.target.value })} />
                  </div>
                  <div className={styles.fg}>
                    <label>성별</label>
                    <select value={vals.gender || ''} onChange={e => setVals({ ...vals, gender: e.target.value })}>
                      <option value="">선택</option>
                      <option value="male">남성</option>
                      <option value="female">여성</option>
                    </select>
                  </div>
                  <div className={styles.fg}>
                    <label>건강 목표</label>
                    <select value={vals.goal || ''} onChange={e => setVals({ ...vals, goal: e.target.value })}>
                      <option value="">선택</option>
                      <option value="immunity">면역력 강화</option>
                      <option value="antioxidant">항산화/노화예방</option>
                      <option value="energy">피로 개선</option>
                      <option value="thyroid">갑상선 건강</option>
                      <option value="general">전반적 건강</option>
                    </select>
                  </div>
                </div>

                {[
                  { title: '혈액 일반', keys: ['hb', 'wbc', 'plt', 'ferritin'] },
                  { title: '갑상선 & 셀레늄', keys: ['tsh', 'ft4', 'selenium', 'vitd'] },
                  { title: '혈당 & 지질', keys: ['glucose', 'ldl', 'tg', 'alt'] },
                ].map(section => (
                  <div key={section.title}>
                    <p className={styles.secTitle}>{section.title}</p>
                    <div className={styles.grid2}>
                      {section.keys.map(k => {
                        const { label, unit, placeholder, min, max } = RANGES[k]
                        const st = getStatus(k, vals[k])
                        return (
                          <div className={styles.fg} key={k}>
                            <label>{label} <span className={styles.unit}>{unit}</span></label>
                            <div className={styles.inpWrap}>
                              <input
                                type="number"
                                placeholder={placeholder}
                                value={vals[k] || ''}
                                onChange={e => setVals({ ...vals, [k]: e.target.value })}
                                className={st === 'low' ? styles.inp_low : st === 'high' ? styles.inp_high : st === 'ok' ? styles.inp_ok : ''}
                              />
                              {st && <span className={`${styles.dot} ${styles['dot_'+st]}`} />}
                            </div>
                            <small>정상: {min}~{max}</small>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ANALYZE BTN */}
            <button className={styles.btnAnalyze} onClick={doAnalyze} disabled={analyzing}>
              {analyzing ? '⏳ 분석 중...' : 'AI 분석 시작하기 →'}
            </button>

          </div>
        </div>

        {/* LOADING */}
        {analyzing && (
          <div className={styles.loadingBox}>
            <p>🔬 혈액 데이터 분석 중...</p>
            <p style={{ fontSize: 13, color: '#6b7898', marginTop: 6 }}>영양 상태와 Daily Mix를 계산하고 있습니다</p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className={styles.errorBox}>
            <strong>⚠️ 오류 발생</strong>
            <p>{error}</p>
          </div>
        )}

        {/* RESULTS */}
        {result && !analyzing && (
          <div className={styles.results}>

            {/* RED FLAG */}
            {result.redFlag ? (
              <div className={styles.resBannerRed}>
                <div className={styles.bannerIcon}>🚨</div>
                <div className={styles.bannerBody}>
                  <h3>의료 상담이 필요한 수치가 발견되었습니다</h3>
                  <p>{result.redFlagMsg}</p>
                  <div className={styles.redFlagNote}>⚠️ IAM AI는 안전을 위해 제품 추천을 제공하지 않습니다.</div>
                </div>
              </div>
            ) : (
              <>
                {/* SUMMARY BANNER */}
                <div className={`${styles.resBanner} ${styles['resBanner_' + result.overallStatus]}`}>
                  <div className={styles.bannerIcon}>
                    {result.overallStatus === 'good' ? '✅' : result.overallStatus === 'warning' ? '⚠️' : '🔴'}
                  </div>
                  <div className={styles.bannerBody}>
                    <h3>{result.overallStatus === 'good' ? '전반적으로 양호한 상태예요' : result.overallStatus === 'warning' ? '일부 수치에 주의가 필요해요' : '개선이 필요한 수치가 있어요'}</h3>
                    <p>{result.summary}</p>
                  </div>
                  <div className={styles.scorePill}>
                    <span style={{ fontSize: 28, fontWeight: 700, color: scoreColor(result.overallScore) }}>{result.overallScore}</span>
                    <span style={{ fontSize: 12, color: '#6b7898' }}>/100</span>
                  </div>
                </div>

                {/* RISK TOP 3 */}
                {result.riskTop3?.length > 0 && (
                  <div className={styles.resSec}>
                    <div className={styles.resSecHead}><span className={styles.secIco} style={{ background: '#fee2e2' }}>🔍</span><h3>주요 리스크 Top 3</h3></div>
                    <div className={styles.resSecBody}>
                      {result.riskTop3.map((r, i) => (
                        <div key={i} className={styles.riskItem}>
                          <div className={styles.riskN} style={{ background: ['#fee2e2','#fef3c7','#e0f2fe'][i], color: ['#991b1b','#92400e','#0c4a6e'][i] }}>{i+1}</div>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ANALYSIS TABLE */}
                <div className={styles.resSec}>
                  <div className={styles.resSecHead}><span className={styles.secIco} style={{ background: '#e8f0ff' }}>🔬</span><h3>수치별 분석</h3></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className={styles.tbl}>
                      <thead><tr><th>항목</th><th>수치</th><th>상태</th><th>의미</th></tr></thead>
                      <tbody>
                        {result.analysis?.map((a, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 500 }}>{a.name}</td>
                            <td style={{ fontFamily: 'monospace' }}>{a.value}</td>
                            <td>
                              <span className={`${styles.valBadge} ${a.status === '정상' ? styles.vOk : a.status === '낮음' ? styles.vLow : styles.vHi}`}>
                                {a.status === '정상' ? '정상' : a.status === '낮음' ? '↓ 낮음' : '↑ 높음'}
                              </span>
                            </td>
                            <td style={{ color: '#6b7898', fontSize: 13 }}>{a.comment}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* DAILY MIX */}
                <div className={styles.resSec}>
                  <div className={styles.resSecHead}><span className={styles.secIco} style={{ background: '#e0f7f5' }}>💊</span><h3>Daily Mix 솔루션</h3></div>
                  <div className={styles.resSecBody}>
                    <p style={{ fontSize: 12, color: '#6b7898', marginBottom: 12 }}>혈액검사 수치(Phenotype) 기반 최적 제품 조합</p>
                    <div className={styles.prodGrid}>
                      {result.dailyMix?.core && (
                        <div className={`${styles.prodCard} ${styles.prodCore}`}>
                          <span className={`${styles.prodTag} ${styles.tagCore}`}>CORE — 항상 포함</span>
                          <div className={styles.prodName}>{result.dailyMix.core.name}</div>
                          <div className={styles.prodSub}>항산화 · 해독/정화 · 항염</div>
                          <div className={styles.prodWhy}>→ {result.dailyMix.core.reason}</div>
                        </div>
                      )}
                      {result.dailyMix?.options?.filter(o => o.triggered).map((o, i) => (
                        <div className={styles.prodCard} key={i}>
                          <span className={`${styles.prodTag} ${o.tag === 'Option A' ? styles.tagA : styles.tagB}`}>{o.tag}</span>
                          <div className={styles.prodName}>{o.name}</div>
                          <div className={styles.prodSub}>트리거: {o.triggerReason}</div>
                          <div className={styles.prodWhy} style={{ color: o.tag === 'Option A' ? '#00b4a0' : '#6d28d9' }}>→ {o.reason}</div>
                        </div>
                      ))}
                    </div>
                    {result.dailyMix?.options?.filter(o => !o.triggered).length > 0 && (
                      <p style={{ fontSize: 12, color: '#6b7898', marginTop: 10 }}>
                        * {result.dailyMix.options.filter(o => !o.triggered).map(o => o.name).join(', ')}은 현재 수치에서 필요하지 않습니다.
                      </p>
                    )}
                  </div>
                </div>

                {/* PROGRAM */}
                <div className={styles.resSec}>
                  <div className={styles.resSecHead}><span className={styles.secIco} style={{ background: '#ede9fe' }}>📅</span><h3>추천 구독 프로그램</h3></div>
                  <div className={styles.resSecBody}>
                    <div className={styles.progBox}>
                      <div className={styles.progBadge} style={{ background: { '4주': '#3b82f6', '8주': '#8b5cf6', '12주': '#0f6e56' }[result.program] || '#3b82f6' }}>
                        {result.program} 프로그램
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {{ '4주': 'Starter · 체감 시작', '8주': 'Builder · 안정화 단계', '12주': 'Master · 습관화 완성' }[result.program]}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7898', marginTop: 2 }}>{result.programReason}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* LIFESTYLE */}
                <div className={styles.resSec}>
                  <div className={styles.resSecHead}><span className={styles.secIco} style={{ background: '#fef3c7' }}>🌿</span><h3>라이프스타일 가이드</h3></div>
                  <div className={styles.resSecBody}>
                    <ul className={styles.adviceList}>
                      {result.advice?.map((a, i) => (
                        <li key={i} className={styles.adviceItem}>
                          <div className={styles.advIco}>{a.icon}</div>
                          <div className={styles.advText}>
                            <strong>{a.category} — {a.title}</strong>
                            {a.detail}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* DISCLAIMER */}
                <div className={styles.disclaimer}>
                  <span>ℹ️</span>
                  <p>본 분석은 건강기능식품 참고용이며 의료 진단을 대체하지 않습니다. 건강 이상이 의심되면 전문 의료기관을 방문해주세요.</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

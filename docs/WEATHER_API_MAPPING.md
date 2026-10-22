# Weather API 매핑

기준 코드: `knhanul/weather` 의 `rt-api.mjs`, `server.mjs`, `date-api.mjs`. 운영 `GET /api/stations`, `GET /api/rt/now?station=108` 로 필드 일부를 확인했습니다. 기존 저장소는 수정하지 않았습니다.

CORS 헤더는 Weather 서버에 없습니다. 이날은 브라우저가 Weather 를 직접 치지 않고 `/weather` 프록시를 씁니다. Weather 쪽 변경은 필요 없습니다.

## 화면에서 쓰는 주소

| 경로 | 파라미터 | 쓰는 필드 |
|---|---|---|
| `/api/stations` | 없음 | `data[].station_id, station_name, region, enabled, favorite, latitude, longitude` |
| `/api/rt/now` | `station` | `station`, `current.time/hour/source/freshness/values(ta,hm,rn1,ws,windDir,pty)`, `current.compare.ta[](id,label,range,mean,diff,percentile)`, `day.max/min.value,source,base,compare` |
| `/api/rt/today` | `station` | now 의 필드 + `hours[](hour,time,obs,fcst,fcstSource)`, `stories[](title,text,basis)` |
| `/api/rt/forecast` | `station` | `hours[](time,ta,pop,pty,sky,source,base,diff)`, `days[](date,max,min,maxSource,sky,wf,wxSource,none)`, `outlook.text`, `releases` |
| `/api/rt/ytd` | `station` | `asOf, source, items[](id,label,unit,value,periods[])` |
| `/api/rt/life` | `station` | `items[](id,q,answer,note,basis)` |
| `/api/rt/records` | `station` | `now_rank(value,time,kind,periods)`, `rule` |
| `/api/rt/regions` | 없음 | `rows[](id,name,temp,note)`, `rankDeviation`, `rankAboveAvg`, `comparable`, `note` |
| `/api/rt/stories` | `station`, `basis=all\|r10\|r5` | `stories[](title,text,kind,basis)`, `basisName`, `emptyText`, `staleNote` |
| `/api/stats/date-weather` | `station, cal, m, d, period=recent10, part=daily` | `stories[].text`, `window.label` |
| `/api/stats/date-battle` | `cases`, `period=recent10`, `part=summary` | `tallies[](word,def,results)`, `window.label`, `cases[]` |

`/api/rt/now` 는 코드상 `/api/rt/today` 의 앞부분입니다. `periods` 는 `all`(1990년 이후), `r10`, `r5` 세 기준입니다.

비교 한 줄의 실제 예: `compare.ta[0]` = `{ id, label, range, mean, diff, percentile, ... }`. `mean` 이나 `diff` 가 없으면 화면은 "비교할 자료가 없습니다"라고만 합니다.

## 확인만 하고 이번 화면에 안 넣은 주소

| 경로 | 이유 |
|---|---|
| `/api/rt/forecast-wind` | 예보 시간의 `ws` 로 우선 표시. 바람 띠는 다음 |
| `/api/rt/similar` | 이야기 엔진이 내부에서 쓰고, 별도 카드는 이야기 API 결과를 씀 |
| `/api/rt/baseline` | 누적 비교는 `/api/rt/ytd` 로 충분 |
| `/api/rt/seasons` | 계절 신호는 `/api/rt/stories` 선별 결과에 포함될 수 있음. 다섯 신호를 전용 카드로 아직 안 펼침 |
| `/api/rt/nation-hours` | 지점별 24시간 묶음. 첫 화면이 무거워져 제외 |
| `/api/hourly`, `/api/daily`, `/api/series`, `/api/dashboard` | 자료실. 모바일 첫 버전 범위 밖 |
| `/api/rt/raw`, `/api/export*`, `/api/collect*`, `/api/jobs`, `/api/gaps`, `/api/key`, `/api/stations/toggle` | 관리·수집·원자료. 프록시 거부 |

## 시간

응답의 `time`, `now`, `base` 는 서버가 이미 한국시간 벽시계 문자열(`YYYY-MM-DD HH:mm`)로 줍니다. 이날은 그 문자열을 잘라 보여 주고, 다시 UTC 로 해석하지 않습니다.

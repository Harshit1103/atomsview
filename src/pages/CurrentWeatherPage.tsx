import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Thermometer,Droplets,Wind,Sun,Sunset,Activity,
  AlertCircle,RefreshCw,CloudRain,Gauge,Eye,ArrowUp,ArrowDown
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { HourlyChart } from '../components/HourlyChart';
import { SkeletonCard, SkeletonChart } from '../components/LoadingSpinner';
import { useWeatherCtx } from '../App';
import { formatTemp,getAQILevel,getWeatherEmoji,getWeatherDescription,toIST } from '../utils/api';

const SectionTitle:React.FC<{icon:string;label:string}>=({icon,label})=>(
  <div className="section-title">
    <span style={{fontSize:14}}>{icon}</span>
    <h3>{label}</h3>
  </div>
);

const AQI_LEVELS=[
  {l:'Good',c:'#22c55e'},{l:'Fair',c:'#84cc16'},{l:'Moderate',c:'#eab308'},
  {l:'Poor',c:'#f97316'},{l:'Very Poor',c:'#ef4444'},{l:'Extremely Poor',c:'#a78bfa'},
];

// Purple-tinted palette for chart data keys
// Using CSS variables so colors adapt to light/dark mode automatically
const COLORS={
  violet:'var(--violet-light)',
  fuchsia:'var(--fuchsia)',
  cyan:'var(--cyan)',
  emerald:'var(--emerald)',
  rose:'var(--rose)',
  amber:'var(--amber)',
  sky:'var(--sky)',
};
// Hardcoded hex for recharts (can't read CSS vars inside SVG)
const CHART={
  violet:'#8b5cf6', fuchsia:'#d946ef', cyan:'#06b6d4',
  emerald:'#10b981', rose:'#f43f5e', amber:'#f59e0b', sky:'#0ea5e9',
  orange:'#f97316',
};

export const CurrentWeatherPage:React.FC=()=>{
  const {
    weatherData,airQualityHourly,airQualityCurrent,
    selectedDate,setSelectedDate,tempUnit,setTempUnit,loading,error,refetch
  }=useWeatherCtx() as any;

  const today=format(new Date(),'yyyy-MM-dd');
  const minDate=format(new Date(Date.now()-15*86400000),'yyyy-MM-dd');

  const hourlyData=useMemo(()=>{
    if(!weatherData?.hourly)return[];
    const{time,temperature_2m,relativehumidity_2m,precipitation,visibility,windspeed_10m,precipitation_probability}=weatherData.hourly;
    return time.filter((t:string)=>t.startsWith(selectedDate)).map((t:string)=>{
      const i=time.indexOf(t);
      return{
        label:format(parseISO(t),'HH:mm'),
        temp:tempUnit==='celsius'?Math.round(temperature_2m[i]??0):Math.round((temperature_2m[i]??0)*9/5+32),
        humidity:Math.round(relativehumidity_2m[i]??0),
        precipitation:+((precipitation[i]??0)).toFixed(2),
        visibility:+((visibility[i]??0)/1000).toFixed(1),
        windspeed:+((windspeed_10m[i]??0)).toFixed(1),
        precip_prob:Math.round(precipitation_probability[i]??0),
      };
    });
  },[weatherData,selectedDate,tempUnit]);

  const aqHourlyData=useMemo(()=>{
    if(!airQualityHourly)return[];
    const{time,pm10,pm2_5}=airQualityHourly;
    return time.filter((t:string)=>t.startsWith(selectedDate)).map((t:string)=>{
      const i=time.indexOf(t);
      return{label:format(parseISO(t),'HH:mm'),pm10:+((pm10[i]??0)).toFixed(1),pm2_5:+((pm2_5[i]??0)).toFixed(1)};
    });
  },[airQualityHourly,selectedDate]);

  const daily=weatherData?.daily;
  const current=weatherData?.current;
  const aq=airQualityCurrent;
  const aqiLvl=aq?getAQILevel(aq.european_aqi):null;
  const tLabel=tempUnit==='celsius'?'°C':'°F';

  const nowH=new Date().getHours();
  const curHumidity=hourlyData.find((d:any)=>d.label===`${String(nowH).padStart(2,'0')}:00`)?.humidity
    ??hourlyData[Math.min(nowH,hourlyData.length-1)]?.humidity??'--';

  if(error)return(
    <div className="error-state">
      <div style={{width:56,height:56,borderRadius:'50%',background:'rgba(251,113,133,.08)',border:'1px solid rgba(251,113,133,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <AlertCircle size={24} style={{color:'var(--rose)'}}/>
      </div>
      <p style={{fontSize:13,color:'var(--text-2)',maxWidth:340,fontFamily:'IBM Plex Mono,monospace'}}>{error}</p>
      <button onClick={refetch} style={{
        display:'flex',alignItems:'center',gap:8,padding:'9px 22px',
        borderRadius:10,background:'rgba(139,92,246,.1)',
        border:'1px solid rgba(139,92,246,.3)',
        color:'var(--violet-light)',fontSize:13,fontFamily:'IBM Plex Mono,monospace',cursor:'pointer',
      }}>
        <RefreshCw size={13}/> Retry
      </button>
    </div>
  );

  return(
    <div style={{display:'flex',flexDirection:'column',gap:30}}>

      {/* ── TOP BAR ── */}
      <div className="top-bar">
        <div>
          <div className="top-bar-title">
            <span style={{fontSize:26}}>{getWeatherEmoji(current?.weathercode??0)}</span>
            {loading?'Loading…':getWeatherDescription(current?.weathercode??0)}
          </div>
          <p className="top-bar-sub">{format(parseISO(selectedDate),'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="top-bar-controls">
          <input type="date" value={selectedDate} min={minDate} max={today} onChange={e=>setSelectedDate(e.target.value)} className="inp"/>
          <div className="pill-toggle">
            {(['celsius','fahrenheit']as const).map(u=>(
              <button key={u} onClick={()=>setTempUnit(u)} className={tempUnit===u?'active':''}>{u==='celsius'?'°C':'°F'}</button>
            ))}
          </div>
          <button onClick={refetch} className="icon-btn" title="Refresh">
            <RefreshCw size={14} className={loading?'spin-anim':''}/>
          </button>
        </div>
      </div>

      {/* ── HERO CARD ── */}
      {loading?(
        <div className="card" style={{height:170}}><div className="skeleton" style={{height:'100%',borderRadius:14}}/></div>
      ):current&&daily&&(
        <div className="card hero-card scale-in">
          <div className="hero-inner" style={{gap:'32px'}}>
            {/* Left: temperature */}
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:0,lineHeight:1}}>
                <span className="hero-temp">
                  {formatTemp(current.temperature,tempUnit).replace('°C','').replace('°F','')}
                </span>
                <span className="hero-unit">{tLabel}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                <span style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:'var(--rose)',fontFamily:'IBM Plex Mono,monospace'}}>
                  <ArrowUp size={11}/>{formatTemp(daily.temperature_2m_max[0],tempUnit)}
                </span>
                <span style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:'var(--cyan)',fontFamily:'IBM Plex Mono,monospace'}}>
                  <ArrowDown size={11}/>{formatTemp(daily.temperature_2m_min[0],tempUnit)}
                </span>
                {aq&&aqiLvl&&(
                  <span className="aqi-badge" style={{
                    background:`${aqiLvl.color}18`,
                    border:`1px solid ${aqiLvl.color}35`,
                    color:aqiLvl.color,
                  }}>
                    AQI {aq.european_aqi} · {aqiLvl.label}
                  </span>
                )}
              </div>
            </div>
            {/* Right: quick stats */}
            <div className="hero-meta" style={{display:'flex',flexDirection:'column',gap:14,textAlign:'right',minWidth:160}}>
              {[
                {icon:<Wind size={12}/>,val:`${daily.windspeed_10m_max[0]?.toFixed(1)} km/h`,lbl:'wind'},
                {icon:<Droplets size={12}/>,val:`${curHumidity}%`,lbl:'humidity'},
                {icon:<Sun size={12}/>,val:`UV ${daily.uv_index_max?.[0]?.toFixed(1)??'N/A'}`,lbl:''},
              ].map((row,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:6,color:'var(--text-2)',fontSize:12,justifyContent:'flex-end',fontFamily:'IBM Plex Mono,monospace'}}>
                  <span style={{color:'var(--violet-light)',opacity:.8}}>{row.icon}</span>
                  <span style={{color:'var(--text-1)'}}>{row.val}</span>
                  {row.lbl&&<span style={{color:'var(--text-3)'}}>{row.lbl}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STAT CARDS ── */}
      {loading?(
        <div className="stat-grid">{Array.from({length:12}).map((_,i)=><SkeletonCard key={i}/>)}</div>
      ):(
        <>
          <section>
            <SectionTitle icon="🌡️" label="Temperature"/>
            <div className="stat-grid stagger">
              <StatCard label="Current" value={current?formatTemp(current.temperature,tempUnit):'--'} icon={<Thermometer size={14}/>} accent={COLORS.violet}/>
              <StatCard label="Maximum" value={daily?.temperature_2m_max[0]!=null?formatTemp(daily.temperature_2m_max[0],tempUnit):'--'} icon={<ArrowUp size={14}/>} accent={COLORS.rose}/>
              <StatCard label="Minimum" value={daily?.temperature_2m_min[0]!=null?formatTemp(daily.temperature_2m_min[0],tempUnit):'--'} icon={<ArrowDown size={14}/>} accent={COLORS.cyan}/>
            </div>
          </section>

          <section>
            <SectionTitle icon="🌫️" label="Atmospheric Conditions"/>
            <div className="stat-grid stagger">
              <StatCard label="Precipitation" value={daily?.precipitation_sum[0]!=null?daily.precipitation_sum[0].toFixed(1):'--'} unit="mm" icon={<CloudRain size={14}/>} accent={COLORS.sky} progress={Math.min((daily?.precipitation_sum[0]??0)*5,100)}/>
              <StatCard label="Rel. Humidity" value={curHumidity} unit="%" icon={<Droplets size={14}/>} accent={COLORS.emerald} progress={typeof curHumidity==='number'?curHumidity:undefined}/>
              <StatCard label="UV Index" value={daily?.uv_index_max[0]!=null?daily.uv_index_max[0].toFixed(1):'N/A'} icon={<Sun size={14}/>} accent={COLORS.amber}
                progress={(daily?.uv_index_max[0]??0)/11*100}
                sublabel={!daily?.uv_index_max[0]?'No data':daily.uv_index_max[0]<=2?'Low':daily.uv_index_max[0]<=5?'Moderate':daily.uv_index_max[0]<=7?'High':'Very High'}/>
            </div>
          </section>

          <section>
            <SectionTitle icon="☀️" label="Sun Cycle"/>
            <div className="stat-grid stagger">
              <StatCard label="Sunrise" value={daily?.sunrise[0]?toIST(daily.sunrise[0]):'--'} icon={<Sun size={14}/>} accent={COLORS.amber} sublabel="IST"/>
              <StatCard label="Sunset"  value={daily?.sunset[0]?toIST(daily.sunset[0]):'--'}  icon={<Sunset size={14}/>} accent="#f97316" sublabel="IST"/>
            </div>
          </section>

          <section>
            <SectionTitle icon="💨" label="Wind & Precipitation"/>
            <div className="stat-grid stagger">
              <StatCard label="Max Wind Speed" value={daily?.windspeed_10m_max[0]!=null?daily.windspeed_10m_max[0].toFixed(1):'--'} unit="km/h" icon={<Wind size={14}/>} accent={COLORS.fuchsia} progress={Math.min((daily?.windspeed_10m_max[0]??0)/150*100,100)}/>
              <StatCard label="Precip Prob Max" value={daily?.precipitation_probability_max[0]!=null?daily.precipitation_probability_max[0]:'N/A'} unit={daily?.precipitation_probability_max[0]!=null?'%':''} icon={<CloudRain size={14}/>} accent={COLORS.sky} sublabel={daily?.precipitation_probability_max[0]==null?'Not available for past dates':undefined} progress={daily?.precipitation_probability_max[0]??undefined}/>
            </div>
          </section>

          <section>
            <SectionTitle icon="🌿" label="Air Quality Metrics"/>
            {aq&&aqiLvl&&(
              <div className="aqi-hero scale-in" style={{background:`linear-gradient(135deg,${aqiLvl.color}0e,${aqiLvl.color}06)`,borderColor:`${aqiLvl.color}22`}}>
                <div>
                  <p style={{fontSize:9,letterSpacing:'.2em',textTransform:'uppercase',color:`${aqiLvl.color}88`,marginBottom:8,fontFamily:'IBM Plex Mono,monospace'}}>
                    European Air Quality Index
                  </p>
                  <div style={{display:'flex',alignItems:'baseline',gap:12}}>
                    <span className="aqi-number" style={{color:aqiLvl.color,filter:`drop-shadow(0 0 20px ${aqiLvl.color}66)`}}>{aq.european_aqi}</span>
                    <span style={{fontSize:18,fontWeight:600,color:aqiLvl.color,fontFamily:'Space Mono,monospace'}}>{aqiLvl.label}</span>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:5,minWidth:140}}>
                  {AQI_LEVELS.map((lvl,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:6,height:6,borderRadius:2,background:lvl.c,flexShrink:0,opacity:aqiLvl.label===lvl.l?1:.25,boxShadow:aqiLvl.label===lvl.l?`0 0 6px ${lvl.c}`:undefined}}/>
                      <span style={{fontSize:11,color:aqiLvl.label===lvl.l?lvl.c:'var(--text-3)',fontFamily:'IBM Plex Mono,monospace',fontWeight:aqiLvl.label===lvl.l?700:400}}>{lvl.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="stat-grid stagger">
              <StatCard label="PM10"             value={aq?.pm10!=null?aq.pm10.toFixed(1):'--'} unit="μg/m³" icon={<Activity size={14}/>} accent="#f97316"/>
              <StatCard label="PM2.5"            value={aq?.pm2_5!=null?aq.pm2_5.toFixed(1):'--'} unit="μg/m³" icon={<Activity size={14}/>} accent={COLORS.rose}/>
              <StatCard label="Carbon Monoxide"  value={aq?.carbon_monoxide!=null?aq.carbon_monoxide.toFixed(0):'--'} unit="μg/m³" icon={<Gauge size={14}/>} accent={COLORS.fuchsia}/>
              <StatCard label="Carbon Dioxide"   value={aq?.carbon_dioxide!=null?aq.carbon_dioxide.toFixed(0):'421'} unit="ppm" icon={<Gauge size={14}/>} accent={COLORS.emerald} sublabel="Global avg"/>
              <StatCard label="Nitrogen Dioxide" value={aq?.nitrogen_dioxide!=null?aq.nitrogen_dioxide.toFixed(1):'--'} unit="μg/m³" icon={<Activity size={14}/>} accent={COLORS.amber}/>
              <StatCard label="Sulphur Dioxide"  value={aq?.sulphur_dioxide!=null?aq.sulphur_dioxide.toFixed(1):'--'} unit="μg/m³" icon={<Activity size={14}/>} accent={COLORS.sky}/>
            </div>
          </section>
        </>
      )}

      {/* ── HOURLY CHARTS ── */}
      <section>
        <SectionTitle icon="📈" label="Hourly Visualizations"/>
        {loading?(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {Array.from({length:4}).map((_,i)=><SkeletonChart key={i}/>)}
          </div>
        ):hourlyData.length===0?(
          <div className="card" style={{padding:40,textAlign:'center',color:'var(--text-3)',fontSize:13,fontFamily:'IBM Plex Mono,monospace'}}>
            No hourly data for this date.
          </div>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <HourlyChart title={`Temperature · ${tLabel}`} titleIcon="🌡️" data={hourlyData}
              dataKeys={[{key:'temp',color:CHART.violet,name:`Temp ${tLabel}`}]} type="area"/>
            <HourlyChart title="Relative Humidity · %" titleIcon="💧" data={hourlyData}
              dataKeys={[{key:'humidity',color:CHART.cyan,name:'Humidity %'}]} type="area"/>
            <HourlyChart title="Precipitation · mm" titleIcon="🌧️" data={hourlyData}
              dataKeys={[{key:'precipitation',color:CHART.sky,name:'Precip mm'}]} type="bar"/>
            <HourlyChart title="Visibility · km" titleIcon="👁️" data={hourlyData}
              dataKeys={[{key:'visibility',color:CHART.fuchsia,name:'Visibility km'}]} type="area"/>
            <HourlyChart title="Wind Speed · km/h" titleIcon="💨" data={hourlyData}
              dataKeys={[{key:'windspeed',color:CHART.emerald,name:'Wind km/h'}]} type="line"/>
            {aqHourlyData.length>0&&(
              <HourlyChart title="Particulate Matter · μg/m³" titleIcon="🌿" data={aqHourlyData}
                dataKeys={[
                  {key:'pm10',color:CHART.orange,name:'PM10 μg/m³'},
                  {key:'pm2_5',color:CHART.rose,name:'PM2.5 μg/m³'},
                ]} type="line"/>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

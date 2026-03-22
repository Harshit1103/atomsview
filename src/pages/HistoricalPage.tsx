import React, { useMemo } from 'react';
import { format,parseISO,differenceInDays } from 'date-fns';
import { AlertCircle,Calendar,TrendingUp,Info,Thermometer,CloudRain,Wind } from 'lucide-react';
import { HistoricalChart } from '../components/HistoricalChart';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatCard } from '../components/StatCard';
import { useHistorical,ARCHIVE_MAX_END,ARCHIVE_MIN_START } from '../hooks/useHistorical';
import { Coordinates } from '../types';

interface Props{coords:Coordinates|null;}

export const HistoricalPage:React.FC<Props>=({coords})=>{
  const{data,startDate,endDate,setStartDate,setEndDate,loading,error}=useHistorical(coords);

  const handleStart=(v:string)=>{
    if(differenceInDays(parseISO(endDate),parseISO(v))>730){
      const c=format(new Date(new Date(v).getTime()+730*86400000),'yyyy-MM-dd');
      setEndDate(c>ARCHIVE_MAX_END?ARCHIVE_MAX_END:c);
    }
    setStartDate(v);
  };
  const handleEnd=(v:string)=>{
    if(differenceInDays(parseISO(v),parseISO(startDate))>730){
      const c=format(new Date(new Date(v).getTime()-730*86400000),'yyyy-MM-dd');
      setStartDate(c<ARCHIVE_MIN_START?ARCHIVE_MIN_START:c);
    }
    setEndDate(v);
  };

  const chartData=useMemo(()=>{
    if(!data)return[];
    return data.time.map((t,i)=>({
      label:format(parseISO(t),data.time.length>90?'MMM d':'MMM d'),
      temp_mean:+(data.temperature_2m_mean[i]??0).toFixed(1),
      temp_max: +(data.temperature_2m_max[i]??0).toFixed(1),
      temp_min: +(data.temperature_2m_min[i]??0).toFixed(1),
      precipitation:+(data.precipitation_sum[i]??0).toFixed(1),
      windspeed:+(data.windspeed_10m_max[i]??0).toFixed(1),
      pm10: data.pm10?+(data.pm10[i]??0).toFixed(1):0,
      pm2_5:data.pm2_5?+(data.pm2_5[i]??0).toFixed(1):0,
      sunriseMin:(()=>{if(!data.sunrise[i])return 0;const d=new Date(data.sunrise[i]);d.setMinutes(d.getMinutes()+330);return d.getUTCHours()*60+d.getUTCMinutes();})(),
      sunsetMin: (()=>{if(!data.sunset[i])return 0; const d=new Date(data.sunset[i]); d.setMinutes(d.getMinutes()+330);return d.getUTCHours()*60+d.getUTCMinutes();})(),
    }));
  },[data]);

  const summary=useMemo(()=>{
    if(!data?.time.length)return null;
    const m=data.temperature_2m_mean;
    return{
      tempAvg:(m.reduce((a,b)=>a+b,0)/m.length).toFixed(1),
      totalRain:data.precipitation_sum.reduce((a,b)=>a+b,0).toFixed(1),
      maxWind:Math.max(...data.windspeed_10m_max).toFixed(1),
      maxTemp:Math.max(...data.temperature_2m_max).toFixed(1),
      minTemp:Math.min(...data.temperature_2m_min).toFixed(1),
      days:data.time.length,
    };
  },[data]);

  const hasAQ=data?.pm10?.some(v=>v>0);

  return(
    <div style={{display:'flex',flexDirection:'column',gap:24}}>

      {/* Header */}
      <div>
        <div className="top-bar-title"><TrendingUp size={20} style={{color:'var(--violet-light)'}}/> Historical Analysis</div>
        <p className="top-bar-sub">Explore up to 2 years of daily weather trends</p>
      </div>

      {/* Date range */}
      <div className="card" style={{padding:'22px 24px'}}>
        <div className="date-range-row" style={{marginBottom:14}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Calendar size={13} style={{color:'var(--violet-light)',flexShrink:0}}/>
            <span style={{fontSize:12,color:'var(--text-2)',fontFamily:'IBM Plex Mono,monospace'}}>from</span>
            <input type="date" value={startDate} min={ARCHIVE_MIN_START} max={endDate} onChange={e=>handleStart(e.target.value)} className="inp"/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:12,color:'var(--text-2)',fontFamily:'IBM Plex Mono,monospace'}}>to</span>
            <input type="date" value={endDate} min={startDate} max={ARCHIVE_MAX_END} onChange={e=>handleEnd(e.target.value)} className="inp"/>
          </div>
          {summary&&(
            <span style={{
              fontSize:11,color:'var(--violet-light)',
              background:'rgba(139,92,246,.1)',border:'1px solid rgba(139,92,246,.25)',
              padding:'4px 12px',borderRadius:99,fontFamily:'IBM Plex Mono,monospace',
            }}>
              {summary.days} days
            </span>
          )}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text-3)',fontFamily:'IBM Plex Mono,monospace'}}>
          <Info size={11} style={{flexShrink:0}}/>
          Archive lag ~6 days — latest: <strong style={{color:'var(--text-2)',marginLeft:4}}>{ARCHIVE_MAX_END}</strong>
        </div>
      </div>

      {/* Summary */}
      {summary&&!loading&&(
        <div className="summary-grid stagger">
          {[
            {label:'Avg Temp',   value:`${summary.tempAvg}°C`, icon:<Thermometer size={14}/>, accent:'#a78bfa'},
            {label:'Max Temp',   value:`${summary.maxTemp}°C`, icon:<Thermometer size={14}/>, accent:'#fb7185'},
            {label:'Min Temp',   value:`${summary.minTemp}°C`, icon:<Thermometer size={14}/>, accent:'#22d3ee'},
            {label:'Total Rain', value:summary.totalRain, unit:'mm', icon:<CloudRain size={14}/>, accent:'#38bdf8'},
            {label:'Max Wind',   value:summary.maxWind,   unit:'km/h', icon:<Wind size={14}/>, accent:'#e879f9'},
            {label:'Days',       value:summary.days, icon:<Calendar size={14}/>, accent:'#34d399'},
          ].map((c,i)=>(
            <StatCard key={i} label={c.label} value={c.value} unit={(c as any).unit} icon={c.icon} accent={c.accent}/>
          ))}
        </div>
      )}

      {loading&&<LoadingSpinner message="Fetching historical data…"/>}
      {error&&!loading&&(
        <div className="card" style={{padding:'32px',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
          <AlertCircle size={26} style={{color:'var(--rose)'}}/>
          <p style={{fontSize:13,color:'var(--text-2)',textAlign:'center',maxWidth:360,fontFamily:'IBM Plex Mono,monospace'}}>{error}</p>
        </div>
      )}

      {/* Charts */}
      {!loading&&!error&&chartData.length>0&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <HistoricalChart title="Temperature · °C" data={chartData} height={260} series={[
            {key:'temp_mean',name:'Mean',color:'#a78bfa',type:'line',yAxisId:'left'},
            {key:'temp_max', name:'Max', color:'#fb7185',type:'line',yAxisId:'left'},
            {key:'temp_min', name:'Min', color:'#22d3ee',type:'line',yAxisId:'left'},
          ]}/>
          <HistoricalChart title="Precipitation · mm" data={chartData} height={220} series={[
            {key:'precipitation',name:'Total mm',color:'#38bdf8',type:'bar',yAxisId:'left'},
          ]}/>
          <HistoricalChart title="Max Wind Speed · km/h" data={chartData} height={220} series={[
            {key:'windspeed',name:'Wind km/h',color:'#e879f9',type:'area',yAxisId:'left'},
          ]}/>
          <HistoricalChart title="Sun Cycle · IST (minutes from midnight)" data={chartData} height={220} series={[
            {key:'sunriseMin',name:'Sunrise',color:'#fbbf24',type:'line',yAxisId:'left'},
            {key:'sunsetMin', name:'Sunset', color:'#f97316',type:'line',yAxisId:'left'},
          ]}/>
          {hasAQ&&(
            <HistoricalChart title="Air Quality · PM10 & PM2.5 (μg/m³)" data={chartData} height={220} series={[
              {key:'pm10', name:'PM10 μg/m³', color:'#f97316',type:'area',yAxisId:'left'},
              {key:'pm2_5',name:'PM2.5 μg/m³',color:'#fb7185',type:'line',yAxisId:'left'},
            ]}/>
          )}
        </div>
      )}

      {!loading&&!error&&chartData.length===0&&coords&&(
        <div className="card" style={{padding:40,textAlign:'center',color:'var(--text-3)',fontSize:13,fontFamily:'IBM Plex Mono,monospace'}}>
          No data for this date range.
        </div>
      )}
      {!coords&&!loading&&(
        <div className="card" style={{padding:40,textAlign:'center',color:'var(--text-3)',fontSize:13,fontFamily:'IBM Plex Mono,monospace'}}>
          Waiting for location…
        </div>
      )}
    </div>
  );
};

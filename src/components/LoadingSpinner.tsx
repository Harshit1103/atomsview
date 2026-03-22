import React from 'react';

export const LoadingSpinner: React.FC<{message?:string}> = ({message='Loading data…'}) => (
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'72px 0',gap:20}}>
    <div style={{position:'relative',width:48,height:48}}>
      <div style={{position:'absolute',inset:0,borderRadius:'50%',border:'1px solid rgba(139,92,246,.2)'}}/>
      <div className="spin-anim" style={{
        position:'absolute',inset:0,borderRadius:'50%',
        border:'2px solid transparent',
        borderTopColor:'#8b5cf6',
        borderRightColor:'rgba(232,121,249,.4)',
        filter:'drop-shadow(0 0 8px rgba(139,92,246,.6))',
      }}/>
    </div>
    <p style={{fontSize:12,color:'var(--text-3)',fontFamily:'IBM Plex Mono,monospace',letterSpacing:'.05em'}}>{message}</p>
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div className="card" style={{padding:18,display:'flex',flexDirection:'column',gap:10}}>
    <div className="skeleton" style={{height:8,width:'55%'}}/>
    <div className="skeleton" style={{height:24,width:'42%'}}/>
    <div className="skeleton" style={{height:2,width:'100%',marginTop:4}}/>
  </div>
);

export const SkeletonChart: React.FC = () => (
  <div className="card" style={{padding:20}}>
    <div className="skeleton" style={{height:10,width:160,marginBottom:20}}/>
    <div className="skeleton" style={{height:188,width:'100%'}}/>
  </div>
);

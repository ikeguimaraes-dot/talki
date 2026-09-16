/* eslint-disable react-hooks/set-state-in-effect -- Synchronize server data and route-driven forms after loading. */
import { useCallback, useEffect, useState } from 'react';
import { loadJornada, type JornadaData } from '@/lib/jornada';
export function useJornada() {
 const [data,setData]=useState<JornadaData|null>(null),[error,setError]=useState('');
 const reload=useCallback(async()=>{try{setData(await loadJornada());setError('');}catch(e){setError(e instanceof Error?e.message:'Falha ao carregar jornada.');}},[]);
 useEffect(()=>{void reload();},[reload]);
 return {data,error,reload};
}

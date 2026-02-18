/**
 * DIAH-7M Frontend Custom Hooks
 * 
 * GPT 피드백 반영:
 * - Custom Hook (Phase 1)
 * - 통일된 loading/error 처리
 */

import { useEffect, useState } from 'react';
import api from '../utils/api';

/**
 * 진단 데이터 Hook
 */
export function useDiagnosis(country = 'kr') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    
    api.getDiagnosis(country)
      .then(result => {
        if (!mounted) return;
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err);
        setLoading(false);
      });
    
    return () => {
      mounted = false;
    };
  }, [country]);
  
  return { data, loading, error };
}

/**
 * 최신 데이터 Hook
 */
export function useLatestData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    
    api.getLatestData()
      .then(result => {
        if (!mounted) return;
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err);
        setLoading(false);
      });
    
    return () => {
      mounted = false;
    };
  }, []);
  
  return { data, loading, error };
}

/**
 * 축별 상세 Hook
 */
export function useAxisDetail(country, axisId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!axisId) {
      setLoading(false);
      return;
    }
    
    let mounted = true;
    setLoading(true);
    setError(null);
    
    api.getAxisDetail(country, axisId)
      .then(result => {
        if (!mounted) return;
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err);
        setLoading(false);
      });
    
    return () => {
      mounted = false;
    };
  }, [country, axisId]);
  
  return { data, loading, error };
}

/**
 * 게이지별 상세 Hook
 */
export function useGaugeDetail(country, gaugeId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!gaugeId) {
      setLoading(false);
      return;
    }
    
    let mounted = true;
    setLoading(true);
    setError(null);
    
    api.getGaugeDetail(country, gaugeId)
      .then(result => {
        if (!mounted) return;
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err);
        setLoading(false);
      });
    
    return () => {
      mounted = false;
    };
  }, [country, gaugeId]);
  
  return { data, loading, error };
}

export default {
  useDiagnosis,
  useLatestData,
  useAxisDetail,
  useGaugeDetail,
};

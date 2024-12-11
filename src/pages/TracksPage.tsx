import React, { useState, useEffect } from 'react';
import { useGlobalContext, useAlltracks } from '../components/Store';
import { parseTracks } from '../utils/trackUtils';
import { Link, useParams } from 'react-router-dom';
import { Tracks } from '../components/Tracks'
import '../styles/TracksPage.css';

export const TracksPage = () => {
  const { userId } = useParams();
  const { state: { isAuthed, principal } } = useGlobalContext();
  const alltracks = useAlltracks();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  
  return (
    <Tracks userId={userId}/>
  );
};
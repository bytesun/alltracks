import React from 'react';
import { useParams } from 'react-router-dom';
import { Tracks } from '../components/Tracks';
import '../styles/TracksPage.css';

export const TracksPage = () => {
  const { userId } = useParams();
  return <Tracks userId={userId} />;
};

import React, { useState, useEffect } from 'react';
import { User, setDoc, listDocs, uploadFile } from "@junobuild/core";
import { CreateTrail } from './CreateTrail';
import './Trails.css';
import { TrailForm } from './CreateTrail';
import { v4 as uuidv4 } from 'uuid';
import Cookies from 'js-cookie';
import { arweave, arweaveGateway } from '../utils/arweave';
import { useNotification } from '../context/NotificationContext';
import { useGlobalContext, useAlltracks } from './Store';
import { Trail as TrailType } from '../api/alltracks/backend.did';
import { routeTypeMap, difficultyMap, parseTrails } from '../utils/trailUtils';

interface Trail {
    id: string;
    name: string;
    description: string;
    distance: number;
    elevationGain: number;
    duration: number;
    routeType: 'loop' | 'out-and-back' | 'point-to-point';
    difficulty: 'easy' | 'moderate' | 'hard' | 'expert';
    rating: number;
    tags: string[];
    userId: string;
    trailfile: string;
    photos: string[];
}

export const Trails: React.FC = () => {
    const { state: {
        isAuthed, principal
    } } = useGlobalContext();
    const alltracks = useAlltracks();

    const [trails, setTrails] = React.useState<Trail[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [wallet, setWallet] = useState<any>(null);
    const { showNotification } = useNotification();


    useEffect(() => {
        loadTrails();
    }, []);

    useEffect(() => {
        const savedWallet = Cookies.get('arweave_wallet');
        if (savedWallet) {
            setWallet(JSON.parse(savedWallet));
        }
    }, []);

    const handleTrailSubmit = async (trailData: TrailForm, file: File) => {
        setIsLoading(true);
        try {
            const extension = file.name.split('.').pop()?.toLowerCase();

            // Map extension to content type
            const contentType = {
                'gpx': 'application/gpx+xml',
                'kml': 'application/vnd.google-earth.kml+xml',
                'csv': 'text/csv',
                'json': 'application/json'
            }[extension] || 'application/octet-stream';
            console.log("Creating trail...", contentType)

            //Create Arweave transaction for trail file
            const fileBuffer = await file.arrayBuffer();

            const transaction = await arweave.createTransaction({
                data: fileBuffer
            });

            // Add metadata tags
            transaction.addTag('Content-Type', contentType);
            transaction.addTag('App-Name', 'AllTracks');
            transaction.addTag('Trail-Name', trailData.name);
            transaction.addTag('Description', trailData.description);
            transaction.addTag('Trail-Type', trailData.routeType);
            transaction.addTag('Difficulty', trailData.difficulty);
            transaction.addTag('Length', trailData.length.toString());
            transaction.addTag('Elevation', trailData.elevationGain.toString());
            transaction.addTag('Rating', trailData.rating.toString());
            transaction.addTag('Tags', trailData.tags.join(','));
            transaction.addTag('User-Key', principal.toText());
            transaction.addTag('File-Type', 'trail');


            // Sign and post transaction
            if (wallet) {
                await arweave.transactions.sign(transaction, wallet);
            } else {
                await arweave.transactions.sign(transaction);
            }
            const response = await arweave.transactions.post(transaction);

            if (response.status === 200) {
                const startPoint = await getStartPoint(file);
                const fileUrl = `${arweaveGateway}/${transaction.id}`;
                const newtrail = {
                    name: trailData.name,
                    description: trailData.description,
                    distance: Number(trailData.length),
                    elevationGain: Number(trailData.elevationGain),
                    duration: Number(trailData.duration),
                    ttype: routeTypeMap[trailData.routeType],
                    difficulty: difficultyMap[trailData.difficulty],
                    rate: Number(trailData.rating),
                    tags: trailData.tags,
                    trailfile: {
                        fileType: contentType,
                        url: fileUrl
                    },
                    photos: trailData.imageUrl?[trailData.imageUrl]:[],
                    startPoint: startPoint
                };
                console.log(newtrail);
                const result = await alltracks.createTrail(newtrail);
                if (result.success) {

                    showNotification('Trail uploaded successfully', 'success');
                } else {
                    console.error('Error uploading trail:', result.error);
                    showNotification('Error uploading trail', 'error');
                }

                showNotification('Trail uploaded successfully', 'success');
            }



            loadTrails(); // Refresh the list
            setShowCreateModal(false);
        } catch (error) {
            console.error('Error saving trail:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStartPoint = async (file: File) => {
        const text = await file.text();
        const extension = file.name.split('.').pop()?.toLowerCase();
        let firstPoint = { latitude: 0, longitude: 0 };
      
        switch(extension) {
          case 'gpx':
            const parser = new DOMParser();
            const gpx = parser.parseFromString(text, "text/xml");
            const trkpt = gpx.querySelector('trkpt');
            if (trkpt) {
              firstPoint = {
                latitude: Number(trkpt.getAttribute('lat')),
                longitude: Number(trkpt.getAttribute('lon'))
              };
            }
            break;
          
          case 'json':
            const json = JSON.parse(text);
            if (json.features?.[0]?.geometry?.coordinates?.[0]) {
              const [lon, lat] = json.features[0].geometry.coordinates[0];
              firstPoint = { latitude: lat, longitude: lon };
            }
            break;
            
          case 'kml':
            const kml = parser.parseFromString(text, "text/xml");
            const coordinates = kml.querySelector('coordinates')?.textContent?.trim().split(' ')[0];
            if (coordinates) {
              const [lon, lat] = coordinates.split(',');
              firstPoint = { latitude: Number(lat), longitude: Number(lon) };
            }
            break;
        }
        
        return firstPoint;
      };
      

    const loadTrails = async () => {
        setIsLoading(true);
        try {
            const trails = await alltracks.getMyTrails();
            const formatTrails = parseTrails(trails);
            console.log(formatTrails);
            setTrails(formatTrails);
        } catch (error) {
            console.error('Error loading trails:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="trails-section">
            {isLoading && (
                <div className="loading-spinner">
                    <span className="material-icons spinning">refresh</span>
                </div>
            )}
            <div className="settings-header">
                <h3>My Trails</h3>
                <button
                    className="create-trail-button"
                    onClick={() => setShowCreateModal(true)}
                >
                    <span className="material-icons">add</span>
                    Create New Trail
                </button>
            </div>

            <div className="trails-list">
                {trails.length > 0 ? (
                    trails.map((trail) => (
                        <div key={trail.id} className="trail-item">
                            <div className="trail-info">
                                <div className="trail-title">{trail.name}</div>
                                <div className="trail-meta">
                                    <span>{trail.distance} km</span>
                                    <span>{trail.duration} hours</span>
                                    <span>{trail.elevationGain} m</span>
                                    <span>{trail.difficulty}</span>

                                    <span>{trail.routeType}</span>
                                    <span>{trail.rating}/5</span>
                                </div>
                            </div>
                            {/* <div className="trail-actions">
                                <button className="trail-button edit">
                                    <span className="material-icons">edit</span>

                                </button>
                                <button className="trail-button delete">
                                    <span className="material-icons">delete</span>

                                </button>
                            </div> */}
                        </div>
                    ))
                ) : (
                    <div className="empty-trails">
                        <span className="material-icons">hiking</span>
                        <p>No trails created yet. Start by creating your first trail!</p>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <div className="modal-overlay">
                  
                        <CreateTrail onClose={() => setShowCreateModal(false)} onSubmit={handleTrailSubmit} />
                    
                </div>
            )}
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { User, setDoc, listDocs, uploadFile } from "@junobuild/core";
import { CreateTrail } from './CreateTrail';
import './Trails.css';
import { TrailForm } from './CreateTrail';
import { v4 as uuidv4 } from 'uuid';
import Cookies from 'js-cookie';
import Arweave from 'arweave';
import { useNotification } from '../context/NotificationContext';
import { useGlobalContext } from './Store';

interface Trail {
    id: string;
    name: string;
    description: string;
    length: number;
    elevationGain: number;
    routeType: 'loop' | 'out-and-back' | 'point-to-point';
    difficulty: 'easy' | 'moderate' | 'hard' | 'expert';
    rating: number;
    tags: string[];
    userId: string;
    fileRef: string;
    imageUrl: string;
}

export const Trails: React.FC = () => {
    const { state:{
        isAuthed, principal
    }} = useGlobalContext();
    
    const [trails, setTrails] = React.useState<Trail[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [wallet, setWallet] = useState<any>(null);
    const { showNotification } = useNotification();


    const arweave = Arweave.init({
        host: 'arweave.net',
        port: 443,
        protocol: 'https'
    });

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
            if (wallet) {
                // Create Arweave transaction for trail file
                const fileBuffer = await file.arrayBuffer();
                const transaction = await arweave.createTransaction({
                    data: fileBuffer
                }, wallet);

                // Add metadata tags
                transaction.addTag('Content-Type', file.type);
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
                await arweave.transactions.sign(transaction, wallet);
                const response = await arweave.transactions.post(transaction);

                if (response.status === 200) {
                    const fileUrl = `https://arweave.net/${transaction.id}`;

                    showNotification('Trail uploaded successfully', 'success');
                }
            } else {
                showNotification('Please connect your wallet', 'error');
            }


            loadTrails(); // Refresh the list
            setShowCreateModal(false);
        } catch (error) {
            console.error('Error saving trail:', error);
        } finally {
            setIsLoading(false);
        }
    };

 

    const loadTrails = async () => {
        setIsLoading(true);
        
        const query = `{
          transactions(
            tags: [
              { name: "App-Name", values: ["AllTracks"] },
              { name: "File-Type", values: ["trail"] },
              { name: "User-Key", values: ["${principal.toText()}"] }
            ]
            first: 100
          ) {
            edges {
              node {
                id
                owner {
                  address
                }
                tags {
                  name
                  value
                }
                block {
                  timestamp
                }
              }
            }
          }
        }`;
      
        const response = await fetch('https://arweave.net/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query })
        });
      
        const result = await response.json();
        const trails = result.data.transactions.edges.map((edge: any) => {
          const tags = edge.node.tags.reduce((acc: any, tag: any) => {
            acc[tag.name] = tag.value;
            return acc;
          }, {});
      
          return {
            id: edge.node.id,
            name: tags['Trail-Name'],
            description: tags['Description'],
            length: Number(tags['Length']),
            elevationGain: Number(tags['Elevation']),
            routeType: tags['Trail-Type'],
            difficulty: tags['Difficulty'],
            fileRef: `https://arweave.net/${edge.node.id}`,
            timestamp: edge.node.block?.timestamp
          };
        });
      
        setTrails(trails);
        setIsLoading(false);
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
                                    <span>{trail.length} km</span>
                                    <span>{trail.difficulty}</span>
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
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Create New Trail</h3>
                            <button
                                className="close-button"
                                onClick={() => setShowCreateModal(false)}
                            >
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <CreateTrail onClose={() => setShowCreateModal(false)} onSubmit={handleTrailSubmit} />
                    </div>
                </div>
            )}
        </div>
    );
};

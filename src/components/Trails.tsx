import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, setDoc, listDocs, uploadFile } from "@junobuild/core";
import { CreateTrail } from './CreateTrail';
import './Trails.css';
import { TrailForm } from './CreateTrail';

import Cookies from 'js-cookie';
import { arweave, arweaveGateway } from '../utils/arweave';
import { useNotification } from '../context/NotificationContext';
import { useGlobalContext, useAlltracks } from './Store';

import { routeTypeMap, difficultyMap, parseTrails } from '../utils/trailUtils';
import { Trail } from '../types/Trail';
import { UpdateTrail } from '../api/alltracks/backend.did';

export const Trails: React.FC = () => {
    const { state: {
        wallet, principal
    } } = useGlobalContext();
    const alltracks = useAlltracks();
    const navigate = useNavigate();

    const [trails, setTrails] = React.useState<Trail[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingTrail, setEditingTrail] = useState<Trail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    // const [wallet, setWallet] = useState<any>(null);
    const { showNotification } = useNotification();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<bigint | null>(null);


    useEffect(() => {
        loadTrails();
    }, []);

    // useEffect(() => {
    //     const savedWallet = Cookies.get('arweave_wallet');
    //     if (savedWallet) {
    //         setWallet(JSON.parse(savedWallet));
    //     }
    // }, []);

    const isOkResult = (result: unknown): result is { ok: unknown } => {
        return typeof result === 'object' && result !== null && 'ok' in result;
    };

    const getContentType = (fileName: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        return {
            gpx: 'application/gpx+xml',
            kml: 'application/vnd.google-earth.kml+xml',
            csv: 'text/csv',
            json: 'application/json',
            geojson: 'application/json'
        }[extension || ''] || 'application/octet-stream';
    };

    const uploadTrailFile = async (trailData: TrailForm, file: File) => {
        const contentType = getContentType(file.name);
        const fileBuffer = await file.arrayBuffer();
        const transaction = await arweave.createTransaction({ data: fileBuffer });

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
        transaction.addTag('User-Key', principal?.toText() || '');
        transaction.addTag('File-Type', 'trail');

        if (wallet) {
            await arweave.transactions.sign(transaction, wallet);
        } else {
            await arweave.transactions.sign(transaction);
        }

        const response = await arweave.transactions.post(transaction);
        if (response.status !== 200) {
            throw new Error(`Trail file upload failed with status ${response.status}`);
        }

        return {
            fileType: contentType,
            url: `${arweaveGateway}/${transaction.id}`,
            startPoint: await getStartPoint(file)
        };
    };

    const buildTrailPayload = async (
        trailData: TrailForm,
        file: File | null,
        existingTrail?: Trail
    ): Promise<UpdateTrail> => {
        const uploadedFile = file ? await uploadTrailFile(trailData, file) : null;
        const imageUrl = trailData.imageUrl.trim();

        return {
            name: trailData.name,
            description: trailData.description,
            distance: Number(trailData.length),
            elevationGain: Number(trailData.elevationGain),
            duration: Number(trailData.duration),
            ttype: routeTypeMap[trailData.routeType],
            difficulty: difficultyMap[trailData.difficulty],
            rate: Number(trailData.rating),
            tags: trailData.tags,
            trailfile: uploadedFile
                ? {
                    fileType: uploadedFile.fileType,
                    url: uploadedFile.url
                }
                : existingTrail?.trailfile,
            photos: imageUrl ? [imageUrl] : [],
            startPoint: uploadedFile?.startPoint || existingTrail?.startPoint || { latitude: 0, longitude: 0 }
        };
    };

    const handleTrailSubmit = async (trailData: TrailForm, file: File | null) => {
        setIsLoading(true);
        try {
            const newtrail = await buildTrailPayload(trailData, file);
            const result = await alltracks.createTrail(newtrail);

            if (isOkResult(result)) {
                showNotification('Trail uploaded successfully', 'success');
                loadTrails();
                setShowCreateModal(false);
            } else {
                console.error('Error uploading trail:', result);
                showNotification('Error uploading trail', 'error');
            }
        } catch (error) {
            console.error('Error saving trail:', error);
            showNotification('Error uploading trail', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTrailUpdate = async (trailData: TrailForm, file: File | null) => {
        if (!editingTrail) {
            return;
        }

        setIsLoading(true);
        try {
            const updatedTrail = await buildTrailPayload(trailData, file, editingTrail);
            const updateResult = await alltracks.updateTrail(BigInt(editingTrail.id), updatedTrail);

            if (!isOkResult(updateResult)) {
                console.error('Error updating trail:', updateResult);
                showNotification('Error updating trail', 'error');
                return;
            }

            showNotification('Trail updated successfully', 'success');
            setEditingTrail(null);
            loadTrails();
        } catch (error) {
            console.error('Error updating trail:', error);
            showNotification('Error updating trail', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const getStartPoint = async (file: File) => {
        const text = await file.text();
        const extension = file.name.split('.').pop()?.toLowerCase();
        let firstPoint = { latitude: 0, longitude: 0 };

        switch (extension) {
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
            const trails = await alltracks.getMyTrails(0n, 100n);
            const formatTrails = parseTrails(trails);
            console.log(formatTrails);
            setTrails(formatTrails);
        } catch (error) {
            console.error('Error loading trails:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteTrail = async (trailId: bigint) => {
        setIsLoading(true);
        try {
            const result = await alltracks.deleteTrail(trailId);
            if (isOkResult(result)) {
                showNotification('Trail deleted successfully', 'success');
                // Refresh trails list after deletion
                loadTrails();
            } else {
                console.error('Error deleting trail:', result);
                showNotification('Error deleting trail', 'error');
            }
        } catch (error) {
            console.error('Error deleting trail:', error);
            showNotification('Error deleting trail', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const openTrailDetail = (trailId: number | string | bigint) => {
        navigate(`/trail/${trailId.toString()}`);
    };

    const toTrailForm = (trail: Trail): TrailForm => ({
        name: trail.name,
        description: trail.description,
        length: trail.distance,
        elevationGain: trail.elevationGain,
        duration: trail.duration,
        routeType: (trail.routeType as TrailForm['routeType']) || 'loop',
        difficulty: (trail.difficulty as TrailForm['difficulty']) || 'moderate',
        rating: trail.rating,
        tags: trail.tags || [],
        imageUrl: trail.photos[0] || ''
    });

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
                    disabled={!wallet}
                    onClick={() => setShowCreateModal(true)}
                >
                    <span className="material-icons">add</span>
                    Create New Trail
                </button>
            </div>

            <div className="trails-list">
                {trails.length > 0 ? (
                    trails.map((trail) => (
                        <div
                            key={trail.id}
                            className="trail-item"
                            role="button"
                            tabIndex={0}
                            onClick={() => openTrailDetail(trail.id)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    openTrailDetail(trail.id);
                                }
                            }}
                        >
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
                            <div className="trail-actions">
                                <button
                                    className="trail-button edit"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setEditingTrail(trail);
                                    }}
                                >
                                    <span className="material-icons">edit</span>
                                    Edit
                                </button>
                                <button
                                    className="trail-button delete"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setShowDeleteConfirm(BigInt(trail.id));
                                    }}
                                >
                                    <span className="material-icons">delete</span>
                                    Delete
                                </button>
                            </div>
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
            {editingTrail && (
                <div className="modal-overlay">
                    <CreateTrail
                        onClose={() => setEditingTrail(null)}
                        onSubmit={handleTrailUpdate}
                        initialValues={toTrailForm(editingTrail)}
                        submitLabel="Update"
                        existingFileLabel={editingTrail.trailfile.url}
                        requireFile={false}
                    />
                </div>
            )}
            {showDeleteConfirm !== null && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Delete Trail</h3>
                        <p>Are you sure you want to delete this trail ({String(showDeleteConfirm)}) ?</p>
                        <div className="modal-buttons">
                            <button
                                onClick={() => {
                                    deleteTrail(showDeleteConfirm);
                                    setShowDeleteConfirm(null);
                                }}
                            >
                                Delete
                            </button>
                            <button onClick={() => setShowDeleteConfirm(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

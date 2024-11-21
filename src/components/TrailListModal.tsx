import { useState, useEffect } from 'react';
import '../styles/TrailListModal.css'

import { Trail } from '../types/Trail';
import { Doc, listDocs } from '@junobuild/core';
interface TrailListModalProps {
    onSelect: (trail: Trail) => void;
    onClose: () => void;
}

export const TrailListModal: React.FC<TrailListModalProps> = ({ onSelect, onClose }) => {
    const [trails, setTrails] = useState<Trail[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredTrails, setFilteredTrails] = useState<Trail[]>([]);

    useEffect(() => {
        loadTrails();
    }, []);

    useEffect(() => {
        const filtered = trails.filter(trail => 
            trail.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trail.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredTrails(filtered);
    }, [searchTerm, trails]);

    const loadTrails = async () => {
        const result = await listDocs<Trail>({
            collection: "trails",
            filter: {
                order: {
                    desc: true,
                    field: "updated_at"
                }
            }
        });

        const trailList = result.items.map(item => item.data as Trail);

        setTrails(trailList);
        setLoading(false);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                
                <div className="search-container">
                    <div className="search-input">
                        <span className="material-icons">search</span>
                        <input
                            type="text"
                            placeholder="Search trails..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="modal-body">
                    <div className="trail-list">
                        {filteredTrails.map(trail => (
                            <div
                                key={trail.id}
                                className="trail-item"
                                onClick={() => onSelect(trail)}
                            >
                                <div className="trail-info">
                                    <h3>{trail.name}</h3>
                                    <div className="trail-stats">
                                        <span>{trail.elevationGain} m</span>
                                        <span>{trail.length} km</span>
                                        <span>{trail.difficulty} </span>
                                    </div>
                                </div>
                                <span className="material-icons">chevron_right</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


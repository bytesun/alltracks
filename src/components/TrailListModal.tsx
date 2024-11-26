import { useState, useEffect } from 'react';
import '../styles/TrailListModal.css'
import Arweave from 'arweave';

import { Trail } from '../types/Trail';

interface TrailListModalProps {
    onSelect: (trail: Trail) => void;
    onClose: () => void;
}
const arweave = new Arweave({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
});

export const TrailListModal: React.FC<TrailListModalProps> = ({ onSelect, onClose }) => {
    const [trails, setTrails] = useState<Trail[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredTrails, setFilteredTrails] = useState<Trail[]>([]);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

    useEffect(() => {
        loadTrails();
    }, []);

    useEffect(() => {
        const filtered = trails.filter(trail => {
            const matchesSearch = trail.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                trail.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDifficulty = selectedDifficulty === 'all' || trail.difficulty === selectedDifficulty;
            return matchesSearch && matchesDifficulty;
        });
        setFilteredTrails(filtered);
    }, [searchTerm, trails, selectedDifficulty]);


    const loadTrails = async () => {

    
        try {
            const query = {
                query: `{
                    transactions(
                        tags: [
                        { name: "App-Name", values: ["AllTracks"] },
                            { name: "File-Type", values: ["trail"] }
                        ]
                    ) {
                        edges {
                            node {
                                id
                                tags {
                                    name
                                    value
                                }
                                data {
                                    size
                                }
                            }
                        }
                    }
                }`
            };
    
            const response = await arweave.api.post('/graphql', query);
            console.log(response);
            const trails = response.data.data.transactions.edges.map(edge => ({
                id: edge.node.id,
                name: edge.node.tags.find(t => t.name === 'name')?.value || '',
                description: edge.node.tags.find(t => t.name === 'description')?.value || '',
                difficulty: edge.node.tags.find(t => t.name === 'difficulty')?.value || '',
                elevationGain: Number(edge.node.tags.find(t => t.name === 'elevationGain')?.value || 0),
                length: Number(edge.node.tags.find(t => t.name === 'length')?.value || 0)
            }));
    
            setTrails(trails);
            setLoading(false);
        } catch (error) {
            console.error('Error loading trails:', error);
            setLoading(false);
        }
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
                    <div className="filter-options">
                        <select 
                            value={selectedDifficulty}
                            onChange={(e) => setSelectedDifficulty(e.target.value)}
                            className="difficulty-select"
                        >
                            <option value="all">All Difficulties</option>
                            <option value="easy">Easy</option>
                            <option value="moderate">Moderate</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>
                </div>
                <div className="modal-body">
                    {loading ? (
                        <div className="loading-container">
                            <span className="material-icons spinning">refresh</span>
                            <span>Loading trails...</span>
                        </div>
                    ) : (
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
                    )}
                </div>
            </div>
        </div>
    );
};


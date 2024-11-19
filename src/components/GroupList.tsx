import React from 'react';
import "../styles/Group.css";
import  { Group } from '../types/Group';
const DEFAULT_BADGE = '/assets/default-group-badge.png';

interface GroupListProps {
  groups: Group[];
  onEditGroup: (group: Group) => void;
}

export const GroupList: React.FC<GroupListProps> = ({ groups, onEditGroup }) => {
  return (
    <div className="groups-list">
      {groups.map((group) => (
        <div key={group.calendarId} className="group-card">
          <div className="group-info">
            <h3>{group.name}</h3>
            <p>{group.description}</p>
    
          </div>
          <div className="group-actions">
            <button 
              className="edit-button"
              onClick={() => onEditGroup(group)}
            >
              <span className="material-icons">edit</span>
            </button>
            <a href={`/group/${group.calendarId}`} className="view-button">
              <span className="material-icons">visibility</span>
            </a>
          </div>
        </div>
      ))}
    </div>
  );
};
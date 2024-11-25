import React, { useState, useEffect } from 'react';
import { Doc, setDoc, listDocs } from '@junobuild/core';
import { GroupList } from './GroupList';
import { CreateGroupModal } from './CreateGroupModal';
import '../styles/Group.css';
import { User } from "@junobuild/core";
import { EditGroupModal } from './EditGroupModal';
import { Group } from '../types/Group';
import { useNotification } from '../context/NotificationContext';
import { useGlobalContext } from './Store';

interface BeEditGroup extends Group {
  key: string;
  version: bigint;
}

export const GroupManagement = () => {
  const { state: { isAuthed } } = useGlobalContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groups, setGroups] = useState<BeEditGroup[]>([]);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      // const { items } = await listDocs<Group>({
      //   collection: "groups",
      //   filter: {
      //     owner: user.key
      //   }
      // });

      // const formattedGroups = items.map(item => ({
      //   ...item.data,
      //   key: item.key,
      //   version: item.version
      // }));

      // setGroups(formattedGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };
  const handleCreateGroup = async (groupData: Group) => {

    try {
      // await setDoc({
      //   collection: "groups",
      //   doc: {
      //     key: groupData.calendarId,
      //     data: {
      //       ...groupData,
      //       members: [user.key],
      //     }
      //   }
      // });
      // await fetchGroups();
      setIsModalOpen(false);
    } catch (error) {
      showNotification(`Error creating group ${error} `, 'error');
    }


  };
  const handleUpdateGroup = async (updatedData: BeEditGroup) => {
    // await setDoc({
    //   collection: "groups",
    //   doc: {
    //     key: updatedData.calendarId,
    //     version: updatedData.version,
    //     data: updatedData
    //   }
    // });

    // await fetchGroups();
    setEditingGroup(null);
  };
  return (
    <div className="groups-container">
      <div className="settings-header">
        <h2>My Groups</h2>
        <button
          className="create-group-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <span className="material-icons">add</span>
          New Group
        </button>
      </div>

      <GroupList
        groups={groups}
        onEditGroup={(group) => setEditingGroup(group)}
      />

      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateGroup}
      />


      {editingGroup && <EditGroupModal
        group={editingGroup}
        onClose={() => setEditingGroup(null)}
        onSubmit={handleUpdateGroup}
      />}

    </div>
  );
};
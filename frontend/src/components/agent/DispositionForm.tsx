'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Phone, User, FileText, Calendar, Save } from 'lucide-react';

interface DispositionCategory {
  id: string;
  name: string;
  code: string;
  color?: string;
  subcategories?: DispositionSubcategory[];
}

interface DispositionSubcategory {
  id: string;
  name: string;
  code: string;
  requiresNotes?: boolean;
  allowsCallback?: boolean;
}

interface CallData {
  id: string;
  phoneNumber: string;
  contactName?: string;
  campaignId: string;
  startTime: string;
  duration?: number;
  record?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    data?: any;
  };
}

interface DispositionFormProps {
  callData: CallData;
  agentId: string;
  onSubmit: (disposition: DispositionData) => void;
  onCancel: () => void;
  isOpen: boolean;
}

interface DispositionData {
  categoryId: string;
  subcategoryId?: string;
  notes?: string;
  isCallback?: boolean;
  callbackDateTime?: string;
}

// Predefined disposition categories
const defaultCategories: DispositionCategory[] = [
  {
    id: 'SALE',
    name: 'Sale',
    code: 'SALE',
    color: 'green',
    subcategories: [
      { id: 'SALE_COMPLETED', name: 'Sale Completed', code: 'SALE_COMPLETED' },
      { id: 'SALE_PENDING', name: 'Sale Pending Approval', code: 'SALE_PENDING', requiresNotes: true },
    ]
  },
  {
    id: 'NO_SALE',
    name: 'No Sale',
    code: 'NO_SALE',
    color: 'red',
    subcategories: [
      { id: 'NOT_INTERESTED', name: 'Not Interested', code: 'NOT_INTERESTED' },
      { id: 'WRONG_NUMBER', name: 'Wrong Number', code: 'WRONG_NUMBER' },
      { id: 'LANGUAGE_BARRIER', name: 'Language Barrier', code: 'LANGUAGE_BARRIER' },
      { id: 'COMPETITOR', name: 'Using Competitor', code: 'COMPETITOR' },
    ]
  },
  {
    id: 'CALLBACK',
    name: 'Callback',
    code: 'CALLBACK',
    color: 'blue',
    subcategories: [
      { 
        id: 'CALLBACK_REQUESTED', 
        name: 'Callback Requested', 
        code: 'CALLBACK_REQUESTED',
        allowsCallback: true,
        requiresNotes: true
      },
      { 
        id: 'BUSY_CALLBACK', 
        name: 'Busy - Call Back Later', 
        code: 'BUSY_CALLBACK',
        allowsCallback: true
      },
    ]
  },
  {
    id: 'NO_ANSWER',
    name: 'No Answer',
    code: 'NO_ANSWER',
    color: 'yellow',
    subcategories: [
      { id: 'NO_ANSWER_MACHINE', name: 'Answering Machine', code: 'NO_ANSWER_MACHINE' },
      { id: 'NO_ANSWER_HANGUP', name: 'No Answer - Hangup', code: 'NO_ANSWER_HANGUP' },
      { id: 'BUSY_SIGNAL', name: 'Busy Signal', code: 'BUSY_SIGNAL' },
    ]
  },
  {
    id: 'DO_NOT_CALL',
    name: 'Do Not Call',
    code: 'DNC',
    color: 'gray',
    subcategories: [
      { id: 'DNC_REQUESTED', name: 'DNC Requested', code: 'DNC_REQUESTED', requiresNotes: true },
      { id: 'DNC_DECEASED', name: 'Deceased', code: 'DNC_DECEASED' },
      { id: 'DNC_INVALID', name: 'Invalid Number', code: 'DNC_INVALID' },
    ]
  },
];

export default function DispositionForm({ callData, agentId, onSubmit, onCancel, isOpen }: DispositionFormProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isCallback, setIsCallback] = useState<boolean>(false);
  const [callbackDateTime, setCallbackDateTime] = useState<string>('');
  const [categories] = useState<DispositionCategory[]>(defaultCategories);

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);
  const selectedSubcategoryData = selectedCategoryData?.subcategories?.find(sub => sub.id === selectedSubcategory);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory('');
      setSelectedSubcategory('');
      setNotes('');
      setIsCallback(false);
      setCallbackDateTime('');
    }
  }, [isOpen]);

  // Auto-enable callback when subcategory allows it
  useEffect(() => {
    if (selectedSubcategoryData?.allowsCallback) {
      setIsCallback(true);
      // Set default callback time to tomorrow at the same time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setCallbackDateTime(tomorrow.toISOString().slice(0, 16));
    } else {
      setIsCallback(false);
      setCallbackDateTime('');
    }
  }, [selectedSubcategoryData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory) {
      alert('Please select a disposition category.');
      return;
    }

    if (selectedCategoryData?.subcategories && !selectedSubcategory) {
      alert('Please select a subcategory.');
      return;
    }

    if (selectedSubcategoryData?.requiresNotes && !notes.trim()) {
      alert('Notes are required for this disposition.');
      return;
    }

    if (isCallback && !callbackDateTime) {
      alert('Please select a callback date and time.');
      return;
    }

    const dispositionData: DispositionData = {
      categoryId: selectedCategory,
      subcategoryId: selectedSubcategory || undefined,
      notes: notes.trim() || undefined,
      isCallback,
      callbackDateTime: isCallback ? callbackDateTime : undefined,
    };

    onSubmit(dispositionData);
  };

  const getCallDuration = () => {
    if (!callData.duration) {
      const start = new Date(callData.startTime);
      const now = new Date();
      return Math.floor((now.getTime() - start.getTime()) / 1000);
    }
    return callData.duration;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Call Disposition
          </CardTitle>
          <CardDescription>
            Record the outcome of the call with {callData.contactName || callData.phoneNumber}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Call Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2 text-gray-500" />
                <span className="font-medium">{callData.phoneNumber}</span>
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-gray-500" />
                <span>{callData.contactName || 'Unknown Contact'}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-500" />
                <span>Duration: {formatDuration(getCallDuration())}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                <span>{new Date(callData.startTime).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Contact Information */}
            {callData.record && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Contact Details:</div>
                <div className="text-sm">
                  {callData.record.email && (
                    <div>Email: {callData.record.email}</div>
                  )}
                  {callData.record.data && (
                    <div>Additional Info: {JSON.stringify(callData.record.data, null, 2)}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div>
              <Label className="text-base font-medium">Disposition Category *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    type="button"
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    className="justify-start"
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setSelectedSubcategory('');
                    }}
                  >
                    <Badge 
                      className={`mr-2 ${
                        category.color === 'green' ? 'bg-green-500' :
                        category.color === 'red' ? 'bg-red-500' :
                        category.color === 'blue' ? 'bg-blue-500' :
                        category.color === 'yellow' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`}
                    >
                      {category.code}
                    </Badge>
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Subcategory Selection */}
            {selectedCategoryData?.subcategories && (
              <div>
                <Label className="text-base font-medium">Subcategory *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {selectedCategoryData.subcategories.map((subcategory) => (
                    <Button
                      key={subcategory.id}
                      type="button"
                      variant={selectedSubcategory === subcategory.id ? 'default' : 'outline'}
                      className="justify-start text-sm"
                      onClick={() => setSelectedSubcategory(subcategory.id)}
                    >
                      {subcategory.name}
                      {subcategory.requiresNotes && (
                        <span className="ml-2 text-xs text-orange-600">*notes</span>
                      )}
                      {subcategory.allowsCallback && (
                        <span className="ml-2 text-xs text-blue-600">callback</span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-base font-medium">
                Notes
                {selectedSubcategoryData?.requiresNotes && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                placeholder="Enter call notes, customer feedback, or additional details..."
                className="mt-1"
                rows={3}
                required={selectedSubcategoryData?.requiresNotes}
              />
            </div>

            {/* Callback Section */}
            {(selectedSubcategoryData?.allowsCallback || isCallback) && (
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-center space-x-2 mb-3">
                  <Checkbox
                    id="callback"
                    checked={isCallback}
                    onChange={(checked: boolean) => setIsCallback(checked)}
                  />
                  <Label htmlFor="callback" className="font-medium">
                    Schedule Callback
                  </Label>
                </div>

                {isCallback && (
                  <div>
                    <Label htmlFor="callbackDateTime" className="text-sm">
                      Callback Date & Time *
                    </Label>
                    <Input
                      id="callbackDateTime"
                      type="datetime-local"
                      value={callbackDateTime}
                      onChange={(e) => setCallbackDateTime(e.target.value)}
                      className="mt-1"
                      required={isCallback}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-slate-700">
                <Save className="h-4 w-4 mr-2" />
                Save Disposition
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
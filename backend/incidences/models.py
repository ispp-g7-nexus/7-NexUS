from django.db import models
from django.conf import settings

class Incidence(models.Model):
    LOCATION_CHOICES = [
        ('my_room', 'My Room'),
        ('common_bathroom', 'Common Bathroom'),
        ('common_areas', 'Common Areas'),
        ('kitchen', 'Kitchen'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),      
        ('reviewing', 'Reviewing'),  
        ('in_progress', 'In Progress'), 
        ('resolved', 'Resolved'),    
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    title = models.CharField(max_length=150)
    description = models.TextField()
    location_type = models.CharField(max_length=20, choices=LOCATION_CHOICES)
    specific_location = models.CharField(max_length=100, help_text="e.g. Room 302-B or 2nd Floor Hallway")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='low')
    
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reported_issues')
    assigned_technician = models.CharField(max_length=100, blank=True, null=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

class IssueUpdate(models.Model):
    issue = models.ForeignKey(Incidence, on_delete=models.CASCADE, related_name='updates')
    text = models.TextField()
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
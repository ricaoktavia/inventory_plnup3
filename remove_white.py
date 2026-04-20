from PIL import Image

def remove_white_and_crop(image_path):
    # Open the image and convert to RGBA
    img = Image.open(image_path).convert("RGBA")
    data = img.getdata()

    new_data = []
    for item in data:
        # Check if the pixel is white (almost white)
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            # Change white (also shades of white) to transparent
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)

    img.putdata(new_data)
    
    # Get the bounding box of the non-transparent area
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(image_path, "PNG")
    print("Done")

remove_white_and_crop("c:\\inventorygudangup3madura\\static\\logo-pln.png")
